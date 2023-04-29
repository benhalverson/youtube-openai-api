import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import { Configuration, OpenAIApi } from "openai";
import { google, youtube_v3 } from "googleapis";

import { env } from "node:process";

console.log("env", env.YOUTUBE_API_KEY);
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

const PORT = 3000;
const app = express();

app.use(bodyParser.json());

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "GREEN" });
});

// Define a route to transcribe and summarize a YouTube video
app.get("/videos/:videoId", async (req: Request, res: Response) => {
  const { videoId } = req.params;

  try {
    // Retrieve video information from YouTube API
    const videoResponse = await youtube.videos.list(
      {
        part: ["snippet"],
        id: [videoId],
      },
      {}
    );

    console.log(
      "videoResponse title",
      videoResponse?.data?.items?.[0]?.snippet?.title
    );
    console.log(
      "videoResponse description",
      videoResponse?.data?.items?.[0]?.snippet?.description
    );
    console.log("youtube id", videoResponse?.data?.items?.[0]?.id);
    console.log(
      "youtube channel id",
      videoResponse?.data?.items?.[0]?.snippet?.channelId
    );
    // Fetch video content from YouTube API
    const videoContentResponse = await youtube.videos.list({
      part: ["contentDetails"],
      id: [videoId],
    });

    // Extract video details
    const videoDetails = videoResponse?.data?.items?.[0]?.snippet ?? {};

    // Extract video content details
    const videoContentDetails =
      videoContentResponse?.data?.items?.[0]?.contentDetails;

    // Generate a summary using OpenAI
    const inputText = `${videoDetails.title}. ${videoDetails.description}`;
    const completion = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: inputText,
      max_tokens: 100,
    });

    // Fetch video transcript using OpenAI
    // const transcription = await openai.transcriptions.create({
    //   audio: `https://www.youtube.com/watch?v=${videoId}`,
    // });

    // // Process the transcript and generate a summary
    // const summary = processTranscription(transcription);

    // Send the response
    res.json({
      title: videoDetails.title,
      description: videoDetails.description,
      // summary,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});

// Helper function to process the transcript and generate a summary
function processTranscription(transcription: any) {
  // Implement your logic here to process the transcription and generate a summary
  // You can utilize OpenAI's language model or other summarization techniques

  // Example: Return the first 100 characters as the summary
  return transcription.text.substring(0, 100);
}

// Start the server
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
