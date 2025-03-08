const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

const openai = new OpenAI({ apiKey: "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" }); // Replace with your key

// Function to fetch latest ESOMAR PDFs
async function fetchLatestPDFs() {
    const url = "https://esomar.org/code-and-guidelines/37-questions-to-help-buyers-of-online-samples";
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    let pdfLinks = [];
    $("a").each((_, element) => {
        const link = $(element).attr("href");
        if (link && link.endsWith(".pdf")) {
            pdfLinks.push(link.startsWith("http") ? link : `https://esomar.org${link}`);
        }
    });

    return pdfLinks;
}

// Function to download & extract text from PDFs
async function downloadAndExtractPDFs() {
    const pdfLinks = await fetchLatestPDFs();
    let pdfData = "";

    for (let pdfUrl of pdfLinks) {
        const response = await axios.get(pdfUrl, { responseType: "arraybuffer" });
        const parsed = await pdfParse(response.data);
        pdfData += parsed.text + "\n\n";
    }

    fs.writeFileSync("pdf_data.txt", pdfData, "utf-8");
}

// API to answer user questions
app.post("/api/chatbot", async (req, res) => {
    const { question } = req.body;
    const pdfText = fs.readFileSync("pdf_data.txt", "utf-8");

    const chatResponse = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            { role: "system", content: "You are an assistant answering based on ESOMAR PDFs." },
            { role: "user", content: `Based on this:\n${pdfText}\nAnswer: ${question}` },
        ],
        max_tokens: 300,
    });

    res.json({ answer: chatResponse.choices[0].message.content });
});

// Start server & fetch PDFs
const PORT = 3000;
app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    await downloadAndExtractPDFs(); // Fetch PDFs on startup
});
 
