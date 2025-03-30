mapboxgl.accessToken = 'pk.eyJ1IjoidG95dWt0aCIsImEiOiJjbTdmeDBkZjcwbGFyMmlzN21mMnNpOXFjIn0.zGMyKcpb-gjpdyhgG-vBSA';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [0, 55],  // 经度 13°E, 纬度 55°N，居中到欧洲中部附近
    zoom: 2.8         // 适合显示整个欧盟的缩放级别
});

//  连接 WebSocket
// const ws = new WebSocket('ws://localhost:8080');
const socket = new WebSocket("wss://hip-shoes-guess.loca.lt");


ws.onopen = () => console.log(" WebSocket 连接成功");
ws.onerror = (error) => console.error(" WebSocket 连接失败:", error);


let heatmapData = null;
let hoveredCountryId = null;
let lastSentCountry = "none"; 
let currentYear = 2015; // 确保 currentYear 是全局变量
let newCountryName = ""; // 确保 newCountryName 在全局作用域

// 加载 `world.json`（国家边界数据）
fetch('new_world.json')
    .then(response => response.json())
    .then(data => {
        console.log(" world.json 加载成功！");

        // 确保所有 Feature 都有数值 `id`
        data.features.forEach((feature, index) => {
            if (typeof feature.id !== "number") {
                feature.id = index;  // 赋予唯一的数值 `id`
            }
        });

        map.on('load', function () {
            // 添加国家边界数据
            map.addSource('countries', {
                type: 'geojson',
                data: data
            });

            // 绘制国家填充区域
            map.addLayer({
                id: 'country-fills',
                type: 'fill',
                source: 'countries',
                paint: {
                    'fill-color': "rgba(0, 0, 0, 0)",
                    'fill-opacity': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false], 0.6, // 悬停时更明显
                        0.7  // 默认透明度
                    ]
                }
            });

            // 绘制国家边界
            map.addLayer({
                id: 'country-borders',
                type: 'line',
                source: 'countries',
                paint: {
                    'line-color': 'rgba(255, 255, 255, 0.5)',
                    'line-width': 1
                }
            });

            console.log(" 国家边界已加载，等待鼠标交互...");

            map.on('mousemove', 'country-fills', function (e) {
                const countryFeatures = e.features;
                if (countryFeatures.length > 0) {
                    const newCountryId = countryFeatures[0].id;
                    newCountryName = countryFeatures[0].properties.name; // ✅ 确保 newCountryName 赋值

                    if (newCountryId !== hoveredCountryId) {
                        if (hoveredCountryId !== null) {
                            map.setFeatureState(
                                { source: 'countries', id: hoveredCountryId },
                                { hover: false }
                            );
                        }

                        hoveredCountryId = newCountryId;
                        map.setFeatureState(
                            { source: 'countries', id: hoveredCountryId },
                            { hover: true }
                        );

                        map.getCanvas().style.cursor = 'pointer';

                        if (lastSentCountry !== newCountryName) {
                            if (ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({
                                    country: newCountryName,
                                    year: currentYear,
                                    group: document.getElementById("data-type").value
                                }));
                                lastSentCountry = newCountryName;
                                lastSentYear = currentYear;
                                console.log(`悬停在国家: ${newCountryName},年份：${currentYear} 正在播放对应声音`);
                            }
                        }
                    }
                }
            });

            setInterval(() => {
                let year = currentYear;
                if (hoveredCountryId !== null && lastSentCountry !== null) {
                    let selectedType = document.getElementById("data-type").value;

                    if (year !== lastSentYear) {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                country: lastSentCountry,
                                year: currentYear,
                                group: selectedType
                            }));
                            console.log(`年份变动: ${currentYear}，重新发送数据`);
                        }
                        updateHeatmap(currentYear);
                        lastSentYear = year;
                    }
                }
            }, 500);

            map.on('mouseleave', 'country-fills', function () {
                if (hoveredCountryId !== null) {
                    map.setFeatureState(
                        { source: 'countries', id: hoveredCountryId },
                        { hover: false }
                    );
                    hoveredCountryId = null;
                }
                map.getCanvas().style.cursor = '';

                if (lastSentCountry !== "none") {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            country: lastSentCountry,
                            year: currentYear,
                            group: document.getElementById("data-type").value
                        }));
                        lastSentCountry = "none";
                        console.log(`鼠标移出国家: ${lastSentCountry}，停止播放声音`);
                    }
                }
            });

        });
        map.on('click', 'country-fills', function (e) {
            if (!isPlaying) {  // **只有在播放暂停时才发送**
                const countryFeatures = e.features;
                if (countryFeatures.length > 0) {
                    const clickedCountryName = countryFeatures[0].properties.name;
                    const selectedType = document.getElementById("data-type").value;
                    
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            country: clickedCountryName,
                            year: currentYear,  
                            group: selectedType
                        }));
                        console.log(`点击国家: ${clickedCountryName}, 年份: ${currentYear - 1}, 发送声音请求`);
                    }
                }
            }
        });
        
    })
    .catch(error => console.error("加载 world.json 失败:", error));

            





// **颜色梯度计算**

function getColorForValue(value) {
    // 颜色梯度映射
    const colors = [
        { value: 10, color: [254, 229, 217] },  // 浅粉 #fee5d9
        { value: 20, color: [252, 187, 161] },  // 浅橙 #fcbba1
        { value: 30, color: [252, 146, 114] },  // 橙红 #fc9272
        { value: 40, color: [251, 106, 74] },   // 深橙 #fb6a4a
        { value: 50, color: [239, 59, 44] },    // 红色 #ef3b2c
        { value: 60, color: [165, 15, 21] }     // 深红 #a50f15
    ];

    // **1. 找到最接近的两个颜色点**
    for (let i = 0; i < colors.length - 1; i++) {
        const c1 = colors[i];
        const c2 = colors[i + 1];

        if (value >= c1.value && value <= c2.value) {
            // **2. 计算线性插值**
            const ratio = (value - c1.value) / (c2.value - c1.value);
            const r = Math.round(c1.color[0] + ratio * (c2.color[0] - c1.color[0]));
            const g = Math.round(c1.color[1] + ratio * (c2.color[1] - c1.color[1]));
            const b = Math.round(c1.color[2] + ratio * (c2.color[2] - c1.color[2]));

            return `rgb(${r},${g},${b})`;  // 返回插值后的颜色
        }
    }

    // **3. 确保值不会超出范围**
    return value < 10 ? "rgb(254,229,217)" : "rgb(165,15,21)";
}


// **更新热力图**
// updateHeatmap里传递的参数是year,后面在togglePlayPause中，调用了updateHeatmap(currentYear)
function updateHeatmap(year) {
    if (!heatmapData || !map.getLayer("country-fills")) return;
    //让用户选择total/male/female,赋值给selectedType
    let selectedType = document.getElementById("data-type").value;

    const paintProperties = [
        "match",
        ["get", "name"]
    ];


// 遍历第一层，对于heatmapData中的国家：
    for (const country in heatmapData) {
        //如果国家和第二第二层的年份都不为空的话：
        //取到selectedType的值，赋给value,通过getColorForValue获得了当前年份国家的颜色，
        //用push追加在paintProperties里
        if (heatmapData[country] && heatmapData[country][year] !== undefined) {
            let value = heatmapData[country][year]?.[selectedType];
            let color = getColorForValue(value);
            paintProperties.push(country, color);
        } else {
            paintProperties.push(country, "rgba(0, 0, 0, 0)"); // 无数据设为透明
        }
    }

    paintProperties.push("rgba(0, 0, 0, 0)"); // 默认透明

    //给具体的layer"country-fills"上色，使用'fill-color'方法，具体的值为paintProperties
    map.setPaintProperty("country-fills", "fill-color", paintProperties);
    console.log(` 更新热力图至 ${year} 年,显示数据类型：${selectedType}`);
}

// **点击播放热力图**
let isPlaying = false;
let intervalId = null;
// let currentYear = 2015;
const minYear = 2015;
const maxYear = 2024;

let updateInterval = 2000;
const InputString = document.getElementById("updateInterval");
const SetupButton = document.getElementById("setupBtn");

SetupButton.addEventListener("click",function(){
    updateInterval = parseFloat(InputString.value)*1000; //把input的s转换为ms
    //如果输入无效，默认间隔为2s;
    if (isNaN(updateInterval) || updateInterval <= 0){
        updateInterval = 2000;
        console.log(`设置新的时间间隔：${updateInterval}`);
    }


});

function togglePlayPause() {
    const button = document.getElementById("playPauseBtn");
    const timeline = document.getElementById("timeline");
    const yearLabel = document.getElementById("current-year");
    
     
    if (isPlaying) {
        clearInterval(intervalId);
        console.log(" 热力图播放暂停");
        button.innerHTML = "Start";
    } else {
        intervalId = setInterval(() => {
            
            console.log(` 显示 ${currentYear} 年`);

            //时间轴更新
            timeline.value = currentYear;
            yearLabel.innerText = currentYear;

            //再渲染热力图
            updateHeatmap(currentYear);
            //再更新年份
            currentYear = (currentYear < maxYear) ? currentYear + 1 : minYear;
        }, updateInterval);
        
        console.log(" 热力图播放开始");
        button.innerHTML ="Pause";
    }
    isPlaying = !isPlaying;
}
document.getElementById("playPauseBtn").addEventListener("click", togglePlayPause);
document.getElementById("data-type").addEventListener("change",function(){
    updateHeatmap(currentYear);
})

//startAutoPlay(); // **页面加载后，自动播放热力图**

// icon legend点击播放
document.addEventListener("DOMContentLoaded",function(){
    const sound1Btn = document.getElementById("sound1-btn");
    const sound2Btn = document.getElementById("sound2-btn");
    const sound1 = document.getElementById("sound1");
    const sound2 = document.getElementById("sound2");

    sound1Btn.addEventListener("click", function(){
        sound2.pause();
        sound1.currentTime = 0;
        sound1.play();
    });

    sound2Btn.addEventListener("click", function(){
        sound1.pause();
        sound2.currentTime = 0;
        sound2.play();
    });
    console.log(`音频点击播放绑定完成`)

    //默认加载2015年的热力图的数据
    console.log(`加载sex_data.json...`)
    fetch("sex_data.json")
    .then(response =>response.json())
    .then(data => {
        heatmapData = data;
        console.log("sex_data.json加载完成")

        // 监听地图加载完成之后，才渲染2015年的数据
        if (map.loaded()){
            console.log(`地图加载已完成，渲染2015年数据`);
            updateHeatmap(2015);
        }else{
            console.log(`等待地图加载完成`);
            map.once("load",function(){
                console.log(`test`)
                updateHeatmap(2015);
            });

        }
        
    })
    .catch(error => console.error("加载失败",error));
})

// document.addEventListener("DOMContentLoaded", function () {
//     const bgSoundToggleBtn = document.getElementById("bgToggle");
//     const backgroundSound = document.getElementById("backgroundSound");
    
//     let isBgSoundOn = false; // 初始状态是关闭

//     bgSoundToggleBtn.addEventListener("click", function () {
//         if (!isBgSoundOn) {
//             backgroundSound.play();
//             bgSoundToggleBtn.textContent = "Turn Off";
//             bgSoundToggleBtn.classList.remove("off");
//         } else {
//             backgroundSound.pause();
//             bgSoundToggleBtn.textContent = "Turn On";
//             bgSoundToggleBtn.classList.add("off");
//         }
//         isBgSoundOn = !isBgSoundOn;
//     });
// });
document.addEventListener("DOMContentLoaded",function(){
    const bgToggleBtn = document.getElementById("bgToggle");
    let isPlaying = false; // 记录背景音乐状态

    bgToggleBtn.addEventListener("click", () => {
        isPlaying = !isPlaying; // 切换播放状态
        const command = isPlaying ? "play" : "stop";

        // 发送 WebSocket 消息到 Node.js 服务器
        ws.send(JSON.stringify({ type: "background_control", command }));

        // 更新按钮文本
        bgToggleBtn.textContent = isPlaying ? "Turn Off" : "Turn On";
    });

})


