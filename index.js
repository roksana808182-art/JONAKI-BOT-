require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Incoming messages
app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    body.entry.forEach(entry => {
      entry.messaging.forEach(async event => {
        const senderId = event.sender.id;
        if (event.message && event.message.text) {
          await handleMessage(senderId, event.message.text);
        }
      });
    });
    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

// Handle messages
async function handleMessage(senderId, text) {
  text = text.trim();

  if (text === "হাই" || text === "hello") {
    await sendText(senderId, "হ্যালো বন্ধু! 😊 কেমন আছো?");
  }
  else if (text.startsWith("!জোক")) {
    await sendText(senderId, "🤣 শিক্ষক: পরীক্ষায় নকল করবে না!\nছাত্র: স্যার, আমি শুধু উত্তরপত্রে লিখবো!");
  }
  else if (text.startsWith("!ছবি ")) {
    const prompt = text.replace("!ছবি ", "");
    const imageUrl = await generateImage(prompt);
    await sendImage(senderId, imageUrl);
  }
  else {
    await sendText(senderId, "🤖 কমান্ড লিখো:\nহাই | !জোক | !ছবি [বর্ণনা]");
  }
}

// Send text
async function sendText(recipientId, text) {
  const url = `https://graph.facebook.com/v17.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
  await axios.post(url, {
    recipient: { id: recipientId },
    message: { text }
  });
}

// Send image
async function sendImage(recipientId, imageUrl) {
  const url = `https://graph.facebook.com/v17.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
  await axios.post(url, {
    recipient: { id: recipientId },
    message: {
      attachment: {
        type: "image",
        payload: { url: imageUrl }
      }
    }
  });
}

// Generate AI Image
async function generateImage(prompt) {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/images/generations",
      {
        model: "gpt-4o-mini",
        prompt: prompt,
        size: "512x512"
      },
      {
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    return response.data.data[0].url;
  } catch (err) {
    console.error("Image API error", err.response?.data || err.message);
    return "https://via.placeholder.com/512?text=Error";
  }
}

app.listen(3000, () => console.log("🚀 Messenger bot running on port 3000"));
