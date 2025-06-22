import express, { Request, Response } from "express";
import fs from 'fs';
import bodyParser from "body-parser";
import { OpenAI } from "openai";
import { google, youtube_v3 } from "googleapis";

import dotenv from "dotenv";

dotenv.config();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const youtube = google.youtube({
  headers: {
    "referrer": "localhost",
  },
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

    
    console.log('response url', videoResponse.request.responseURL);
    
    const description = videoResponse?.data?.items?.[0]?.snippet?.description;
    const tags = videoResponse?.data?.items?.[0]?.snippet?.tags;
    const thumbnail = videoResponse?.data?.items?.[0]?.snippet?.thumbnails?.standard?.url;
    const otherVideoId = videoResponse?.data?.items?.[0]?.id;

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
    
    console.log('videoContentDetails', videoContentDetails)

    const videoSummary =  processVideoDescription(videoDetails.description ?? "");
    console.log('video Summary', videoSummary);
    res.json({
      title: videoDetails.title,
      description: videoDetails.description,
      tags: tags,
      thumbnail: thumbnail,
      otherDescription: description,
      otherVideoId: otherVideoId,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "An error occurred" });
  }
});

// Helper function to process the video description
async function processVideoDescription(transcription: string) {
  try {
    const summary = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [{
        role: 'system',
        content: `You are a helpful assistant that can parse and summarize video descriptions.`
      }, {
        role: 'user',
        content: `Summarize this transcription succinctly: \n ${transcription}`
      }],

    });
    return summary.choices[0].message.content;
  } catch (error) {
    console.error("Error:", error);
    return "An error occurred";
  }
}

// helper function to transcribe audio with OpenAI whisper.
async function processAudio(audio: string) {
  try {
  // Transcribe audio with OpenAI whisper
  const transcription = await openai.audio.transcriptions.create({
    model: "whisper",
    response_format: "text",
    file: fs.createReadStream(`${__dirname}/audio/${audio}`),
    temperature: 0
  });  
  console.log('transcription', transcription)
  return transcription;
  } catch (error) {
   console.error("Error processing audio", error); 
  }
}

// Start the server
app.listen(PORT, () => {
  console.log("Server is running on port 3000");
});
