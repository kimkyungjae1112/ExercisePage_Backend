/* DevDaily Quiz Backend
 * - 생성형 AI(OpenAI)를 이용해 퀴즈 문제를 생성하는 간단한 API 서버입니다.
 * - 프론트엔드(index.html)에서 /generate-quiz 엔드포인트를 호출해 사용합니다.
 */

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

if (!process.env.OPENAI_API_KEY) {
  console.warn(
    "[경고] OPENAI_API_KEY 환경변수가 설정되어 있지 않습니다. " +
      ".env 파일을 만들고 OPENAI_API_KEY를 넣어주세요."
  );
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/generate-quiz", async (req, res) => {
  try {
    const { topic, count = 5, level = "mixed" } = req.body || {};

    const safeCount = Math.min(Math.max(parseInt(count, 10) || 5, 3), 15);
    const topicText = topic || "자료구조, 운영체제, 네트워크, C++, 언리얼 엔진";

    const prompt = `
너는 한국어로 설명하는 선배 게임 클라이언트 개발자다.
아래 형식의 JSON 배열로만 응답해라 (설명 텍스트 없이).

주제: ${topicText}
문제 개수: ${safeCount}
난이도: ${level} (easy, medium, hard 섞어서 적절히)

각 원소는 다음 필드를 가진다:
- id: number (1부터 순서대로)
- topic: string (예: "자료구조", "운영체제", "언리얼 상식" 등)
- level: "easy" | "medium" | "hard"
- question: string (짧고 명확한 객관식 문제)
- choices: string[] (4지선다 보기)
- answerIndex: number (0~3, 정답 인덱스)
- explanation: string (정답 해설, 개념 상기용)

형식 예시:
[
  {
    "id": 1,
    "topic": "자료구조",
    "level": "easy",
    "question": "스택(Stack)의 특징으로 가장 알맞은 것은?",
    "choices": ["...", "...", "...", "..."],
    "answerIndex": 0,
    "explanation": "..."
  }
]
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "반드시 유효한 JSON만 반환해라. JSON 이외의 텍스트는 금지.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("모델 응답이 비어 있습니다.");
    }

    let questions;
    try {
      questions = JSON.parse(content);
    } catch (err) {
      console.error("JSON 파싱 오류, 원본 응답:", content);
      throw new Error("AI 응답을 JSON으로 파싱하는 데 실패했습니다.");
    }

    if (!Array.isArray(questions)) {
      throw new Error("AI 응답이 배열 형식이 아닙니다.");
    }

    res.json(questions);
  } catch (err) {
    console.error("퀴즈 생성 오류:", err);
    res.status(500).json({ error: "퀴즈 생성 실패", message: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`DevDaily Quiz backend listening on port ${port}`);
});

