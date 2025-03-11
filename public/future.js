mapboxgl.accessToken = 'pk.eyJ1IjoidG95dWt0aCIsImEiOiJjbTdmeDBkZjcwbGFyMmlzN21mMnNpOXFjIn0.zGMyKcpb-gjpdyhgG-vBSA';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [13, 55],  // 经度 13°E, 纬度 55°N，居中到欧洲中部附近
    zoom: 3         // 适合显示整个欧盟的缩放级别
});

map.on('load', function () {
    console.log("Map has loaded");

    fetch('world.json')
        .then(response => response.json())
        .then(data => {
            console.log("World data loaded:", data);

            // 添加国家边界数据源
            map.addSource('countries', {
                type: 'geojson',
                data: data
            });

            // 颜色匹配数组
            const paintProperties = [
                'match',
                ['get', 'name']
            ];

            //  处理欧盟国家（固定颜色）
            data.features.forEach(feature => {
                let countryName = feature.properties.name;
                if (euColors[countryName]) {
                    paintProperties.push(countryName, euColors[countryName]);
                }
            });

            //  其他所有国家统一使用绿色
            paintProperties.push('#D5E8D4'); // 柔和绿色

            // 添加 `fill` 图层
            map.addLayer({
                'id': 'country-fills',
                'type': 'fill',
                'source': 'countries',
                'paint': {
                    'fill-color': paintProperties,
                    'fill-outline-color': '#AAAAAA' // **边界颜色**
                }
            });

            console.log("Country layer added!");
        })
        .catch(error => console.error("Error loading world.json:", error));
});

const euColors = {
    'Austria': '#FF8A80',       // 柔和红
    'Belgium': '#FFB74D',       // 亮橙
    'Bulgaria': '#FFD54F',      // 柔和黄
    'Croatia': '#81C784',       // 活力绿
    'Cyprus': '#64B5F6',        // 亮蓝
    'Czech Republic': '#9575CD',// 活力紫
    'Denmark': '#E57373',       // 柔和红
    'Estonia': '#FFB74D',       // 亮橙
    'Finland': '#FFD54F',       // 柔和黄
    'France': '#66BB6A',        // 活力绿
    'Germany': '#42A5F5',       // 活力蓝
    'Greece': '#BA68C8',        // 活力紫
    'Hungary': '#EF5350',       // 深红
    'Ireland': '#FFA726',       // 深橙
    'Italy': '#FFEB3B',         // 深黄
    'Latvia': '#4CAF50',        // 深绿
    'Lithuania': '#2196F3',     // 深蓝
    'Luxembourg': '#8E24AA',    // 深紫
    'Malta': '#D32F2F',         // 红
    'Netherlands': '#FB8C00',   // 深橙
    'Poland': '#FDD835',        // 深黄
    'Portugal': '#2E7D32',      // 深绿
    'Romania': '#1565C0',       // 深蓝
    'Slovakia': '#6A1B9A',      // 深紫
    'Slovenia': '#E64A19',      // 柔和红
    'Spain': '#FF9800',         // 柔和橙
    'Sweden': '#FFEE58'         // 柔和黄
};

//控制播放声音
document.addEventListener("DOMContentLoaded", function () {
    const playPauseBtn = document.getElementById("playPauseBtn");
    const futureSound = document.getElementById("futureSound");

    let isPlaying = false;

    playPauseBtn.addEventListener("click", function () {
        if (!isPlaying) {
            futureSound.play();
            playPauseBtn.textContent = "⏸ Pause";
        } else {
            futureSound.pause();
            playPauseBtn.textContent = "▶ Play";
        }
        isPlaying = !isPlaying;
    });

    // 确保播放完成后按钮恢复
    futureSound.addEventListener("ended", function () {
        playPauseBtn.textContent = "▶ Play";
        isPlaying = false;
    });
});
