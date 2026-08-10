import * as webllm from "https://esm.run/@mlc-ai/web-llm";

const chatHistory = document.getElementById("chat-history");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const statusDiv = document.getElementById("status");
const modelSelect = document.getElementById("model-select");

let engine = null;

// 1. WebLLM ki official pre-built model list fetch karna
async function initModelSelector() {
    try {
        // webllm.prebuiltAppConfig.model_list se saare models ki list mil jati hai
        const modelList = webllm.prebuiltAppConfig.model_list;
        
        modelSelect.innerHTML = ""; // Purana text hatao
        
        // Dropdown mein saare models add karo
        modelList.forEach((m) => {
            const option = document.createElement("option");
            option.value = m.model_id;
            option.text = m.model_id; // Aap chahein toh clean name bhi dikha sakte hain
            modelSelect.appendChild(option);
        });

        modelSelect.disabled = false;
        
        // Pehla model default load karlo
        const defaultModel = modelSelect.value;
        await loadModel(defaultModel);

    } catch (error) {
        statusDiv.innerText = "Error fetching model list: " + error.message;
        console.error(error);
    }
}

// 2. Model load karne ka function
async function loadModel(modelName) {
    statusDiv.innerText = `Loading ${modelName}... (First time loading takes time)`;
    userInput.disabled = true;
    sendBtn.disabled = true;
    modelSelect.disabled = true;

    try {
        // Agar pehle se engine chal raha hai toh use reset/unload karne ki zaroorat nahi, CreateMLCEngine naya load kar lega
        engine = await webllm.CreateMLCEngine(modelName, {
            initProgressCallback: (p) => {
                statusDiv.innerText = p.text;
            }
        });

        statusDiv.innerText = `Ready! Using: ${modelName}`;
        userInput.disabled = false;
        sendBtn.disabled = false;
        modelSelect.disabled = false;
    } catch (error) {
        statusDiv.innerText = "Error: " + error.message;
        modelSelect.disabled = false;
        console.error(error);
    }
}

// 3. Jab user dropdown se naya model badle
modelSelect.onchange = async () => {
    const selectedModel = modelSelect.value;
    chatHistory.innerHTML += `<div class="msg ai" style="color: gray;"><i>Switching to ${selectedModel}...</i></div>`;
    await loadModel(selectedModel);
};

// 4. Chat Send & Streaming Logic
async function sendMessage() {
    const text = userInput.value;
    if (!text || !engine) return;

    chatHistory.innerHTML += `<div class="msg user"><b>You:</b> ${text}</div>`;
    userInput.value = "";
    chatHistory.scrollTop = chatHistory.scrollHeight;

    const aiMsgDiv = document.createElement("div");
    aiMsgDiv.className = "msg ai";
    aiMsgDiv.innerHTML = `<b>AI:</b> <span class="ai-text"></span>`;
    chatHistory.appendChild(aiMsgDiv);
    const textSpan = aiMsgDiv.querySelector(".ai-text");

    try {
        const messages = [
            { role: "system", content: "be honest and objective." },
            { role: "user", content: text }
        ];

        const asyncStream = await engine.chat.completions.create({
            messages: messages,
            stream: true,
            temperature: 0.0
        });

        let fullResponse = "";
        for await (const chunk of asyncStream) {
            const delta = chunk.choices[0]?.delta?.content || "";
            fullResponse += delta;
            textSpan.innerText = fullResponse;
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }

    } catch (error) {
        console.error(error);
        textSpan.innerText = "Error generating response.";
    }
}

sendBtn.onclick = sendMessage;
userInput.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };

// Sabse pehle list initialize karo
initModelSelector();