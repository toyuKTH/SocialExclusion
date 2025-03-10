mapboxgl.accessToken = 'pk.eyJ1IjoidG95dWt0aCIsImEiOiJjbTdmeDBkZjcwbGFyMmlzN21mMnNpOXFjIn0.zGMyKcpb-gjpdyhgG-vBSA';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [13, 55],  // 经度 13°E, 纬度 55°N，居中到欧洲中部附近
    zoom: 3         // 适合显示整个欧盟的缩放级别
});

//  连接 WebSocket
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => console.log(" WebSocket 连接成功");
ws.onerror = (error) => console.error(" WebSocket 连接失败:", error);

let heatmapData = null;


let hoveredCountryId = null;
let lastSentCountry = "none"; // 记录最后发送的国家，防止重复发送

// 加载 `world.json`（国家边界数据）
fetch('world.json')
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

            let lastSentCountry = null; // 记录上一次发送的国家
            let lastSentYear = null; // 记录上一次发送的年份
            let hoveredCountryId = null; // 记录当前悬停的国家ID

            // 鼠标悬停时高亮国家并发送国家名到 SuperCollider
            map.on('mousemove', 'country-fills', function (e) {
                const countryFeatures = e.features;

                if (countryFeatures.length > 0) {
                    const newCountryId = countryFeatures[0].id;
                    const newCountryName = countryFeatures[0].properties.name;

                    if (newCountryId !== hoveredCountryId) {
                        // 取消之前国家的高亮状态
                        if (hoveredCountryId !== null) {
                            map.setFeatureState(
                                { source: 'countries', id: hoveredCountryId },
                                { hover: false }
                            );
                        }

                        // 更新 hoveredCountryId
                        hoveredCountryId = newCountryId;

                        // 设置当前国家高亮
                        map.setFeatureState(
                            { source: 'countries', id: hoveredCountryId },
                            { hover: true }
                        );

                        map.getCanvas().style.cursor = 'pointer';

                        // 获取当年年份和选中群体类型
                        // let year = currentYear;
                        // let selectedType = document.getElementById("data-type").value;
                        // ✅ **初始化 lastSentYear，防止 setInterval 无法检测年份变化**
                        // if (lastSentYear === null) {
                        //      lastSentYear = year;
                        // }

                        // **确保只有在国家变化时才发送数据**
                        if (lastSentCountry !== newCountryName) {
                            if (ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({ 
                                    country: newCountryName,
                                    year: currentYear,
                                    group: document.getElementById("data-type").value
                                 }));
                                lastSentCountry = newCountryName;
                                //记录已发送的年份
                                lastSentYear = year;
                                console.log(` 悬停在国家: ${newCountryName}, 正在播放对应声音`);
                            }
                        }
                    }
                }
            });

            //定期检查currentYear 是否变动
            setInterval(() => {
                if (hoveredCountryId !== null && lastSentCountry !== null) {
                    let selectedType = document.getElementById("data-type").value;
                    let year = currentYear;
            
                    // **如果年份变化，且国家未变，则重新发送数据**
                    if (year !== lastSentYear) {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                country: lastSentCountry, // 使用之前悬停的国家
                                year: year,
                                group: selectedType
                            }));

                            
                           
                            console.log(` 年份变动: ${year}，重新发送数据（国家: ${lastSentCountry}, 群体: ${selectedType}）`);
                            // lastSentYear = year; // 更新记录
                        }
                         //  **同步更新热力图**
                        updateHeatmap(year);
                        console.log(`🔥 热力图更新至 ${year} 年`);

                        lastSentYear = year;
                    }
                }
            }, 1000); // **每1秒检查一次年份**

            // 鼠标离开国家时停止声音
            map.on('mouseleave', 'country-fills', function () {
                if (hoveredCountryId !== null) {
                    map.setFeatureState(
                        { source: 'countries', id: hoveredCountryId },
                        { hover: false }
                    );
                    hoveredCountryId = null;
                }
                map.getCanvas().style.cursor = '';

                // **确保只发送一次 "none"，避免重复请求**
                if (lastSentCountry !== "none") {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ 
                            country: newCountryName,
                            year: currentYear,
                            group: document.getElementById("data-type").value
                        }));
                        lastSentCountry = "none";
                        console.log("鼠标移出国家，停止播放声音");
                    }
                }
            });

        });
    })
    .catch(error => console.error(" 加载 world.json 失败:", error));





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
let currentYear = 2015;
const minYear = 2015;
const maxYear = 2024;

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
            updateHeatmap(currentYear);
            console.log(` 显示 ${currentYear} 年`);

            //时间轴更新
            timeline.value = currentYear;
            yearLabel.innerText = currentYear;
            currentYear = (currentYear < maxYear) ? currentYear + 1 : minYear;
        }, 2000);
        
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