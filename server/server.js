const WebSocket = require('ws');
const osc = require('osc');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const WSS_PORT = 8080;

//读取sex_data.json
const dataFilePath = path.join(__dirname, '../public/sex_data.json'); 
const sexData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));

// 提供静态文件
app.use(express.static(path.join(__dirname, '../public')));
app.listen(PORT, () => console.log(` 前端服务器运行在: http://localhost:${PORT}`));

// 启动 WebSocket 服务器
const wss = new WebSocket.Server({ port: WSS_PORT });
console.log(` WebSocket 服务器运行在 ws://localhost:${WSS_PORT}`);

const udpPort = new osc.UDPPort({
    localAddress: "127.0.0.1",
    localPort: 57121
});

udpPort.open();
udpPort.on("ready", () => console.log(" OSC 服务器 (SuperCollider) 已准备好，监听端口 57121"));

//WebSocket监听前端发送的数据
wss.on('connection', (ws) => {
    console.log(" WebSocket 客户端已连接");

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === "background_control") {
                const command = data.command; // "play" or "stop"
                console.log(` 背景音乐控制: ${command}`);

                // 发送 OSC 消息到 SuperCollider
                udpPort.send({
                    address: "/background_control",
                    args: [command]
                }, "127.0.0.1", 57120);
                return; // **跳过下面的国家数据逻辑**
            }


            const {country, year, group} = data;
            console.log(` 收到国家: ${data.country},年份：${year},群体：${group}`);

            //只查找有效数据
            if (country !== "none" && sexData[country]&& sexData[country][year]){
                let value = sexData[country][year][group];
                
                //  发送 OSC 消息到 SuperCollider
                udpPort.send({ 
                     address: "/country_info",
                     args: [group,value] 
                    }, "127.0.0.1", 57120);
                    console.log(` 已发送 OSC 消息到 SuperCollider: ${group},${value}`);
                }else{
                    console.log(`未找到数据，不发送osc`)
                }
             } catch (error) {
            console.error(" 解析 WebSocket 消息失败:", error);
             }   
    });

    ws.on('close', () => console.log(" WebSocket 客户端断开"));
    ws.on('error', (err) => console.error(" WebSocket 服务器错误:", err));
});

udpPort.on("error", (err) => console.error("OSC 服务器错误: ", err.message));
