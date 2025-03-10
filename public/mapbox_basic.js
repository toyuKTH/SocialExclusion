mapboxgl.accessToken = 'pk.eyJ1IjoidG95dWt0aCIsImEiOiJjbTdmeDBkZjcwbGFyMmlzN21mMnNpOXFjIn0.zGMyKcpb-gjpdyhgG-vBSA';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [15.0, 60.0], // 以瑞典为中心
    zoom: 4
});

//  连接 WebSocket
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => console.log(" WebSocket 连接成功");
ws.onerror = (error) => console.error(" WebSocket 连接失败:", error);

// 加载 `world.json`（国家边界数据）
fetch('world.json')
    .then(response => response.json())
    .then(data => {
        console.log(" world.json 加载成功！");

        map.on('load', function () {
            // 添加国家边界数据
            map.addSource('countries', {
                type: 'geojson',
                data: data
            });

            // 绘制国家填充区域（默认透明）
            map.addLayer({
                id: 'country-fills',
                type: 'fill',
                source: 'countries',
                paint: {
                    'fill-color': '#3B82F6', // 使用淡蓝色
                    'fill-opacity': 
                    ['case',['boolean', ['feature-state', 'hover'], false],  
                    0.5,
                    0.2   // 默认透明度
                    ]
                }
            });

            // 绘制国家边界（柔和边界）
            map.addLayer(
                {
                id: 'country-borders',
                type: 'line',
                source: 'countries',
                paint: {
                    'line-color': 'rgba(255, 255, 255, 0.5)', // 透明白色
                    'line-width': 1
                }
            }              
        );

            console.log("国家边界已加载，等待点击事件...");

            //存储当前悬停国家
            let hoveredCountryId = null;
           /*
            map.on('mousemove','country-fills',function(e){
                if (e.features.length > 0){
                    if (hoveredCountryId !== null) {
                        //先恢复之前悬停国家的透明度
                        map.setFeatureState(
                            {source: 'countries',id: hoveredCountryId},
                            {hover: false}
                        );
                    }
                    //更新新的悬停国家ID，并设置高亮
                    hoveredCountryId = e.features[0].id;
                    map.setFeatureState(
                        {source:'countries',id:hoveredCountryId},
                        {hover: true}
                    );
                    //鼠标悬停时改变样式
                    map.getCanvas().style.cursor = 'pointer';
                }
            });
            */
            map.on('mousemove', 'country-fills', function (e) {
                if (e.features.length > 0) {
                    console.log("当前悬停的 Feature:", e.features[0]); // ✅ 检查获取的数据
                    console.log("当前悬停的 ID:", e.features[0].id); // ✅ 检查 id 是否为空
            
                    if (hoveredCountryId !== null) {
                        map.setFeatureState(
                            { source: 'countries', id: hoveredCountryId },
                            { hover: false }
                        );
                    }
            
                    hoveredCountryId = e.features[0].id;  // ✅ 确保 `id` 正确获取
                    map.setFeatureState(
                        { source: 'countries', id: hoveredCountryId },
                        { hover: true }
                    );
            
                    map.getCanvas().style.cursor = 'pointer';
                }
            });
            

            map.on('mouseleave','country-fills',function(){
                if (hoveredCountryId !== null){
                    //仅恢复当前悬停国家
                    map.setFeatureState(
                        {source:'countries',id:hoveredCountryId},
                        {hover: false}
                    );
                    hoveredCountryId = null;
                }
                //鼠标离开时恢复指针
                map.getCanvas().style.cursor = '';
            });


            // 监听鼠标悬停，轻微变亮
            /*
            map.on('mouseenter', 'country-fills', function () {
                map.setPaintProperty('country-fills', 'fill-opacity', 0.4); // 鼠标悬停时变亮
                map.getCanvas().style.cursor = 'pointer';
            });

            map.on('mouseleave', 'country-fills', function () {
                map.setPaintProperty('country-fills', 'fill-opacity', 0.2); // 鼠标离开后恢复
                map.getCanvas().style.cursor = '';
            });
            */

            //  监听点击事件
            map.on('click', function (e) {
                console.log(" 你点击了地图，查询国家信息...");
                
                const features = map.queryRenderedFeatures(e.point, { layers: ['country-fills'] });

                if (features.length > 0) {
                    const countryName = features[0].properties.name;
                    console.log(` 你点击了国家: ${countryName}`);

                    // 发送国家信息到 WebSocket 服务器
                    ws.send(JSON.stringify({ country: countryName }));

                    //  视觉反馈：点击后变亮
                    map.setPaintProperty('country-fills', 'fill-opacity', 0.6); // 点击后暂时变亮
                    setTimeout(() => {
                        map.setPaintProperty('country-fills', 'fill-opacity', 0.2); // 2秒后恢复
                    }, 2000);

                    //  反馈用户点击了哪个国家
                    alert(`🎵 你点击了 ${countryName}，正在播放相应的声音！`);
                } else {
                    console.warn(" 你点击的地方没有国家数据");
                }
            });
        });
    })
    .catch(error => console.error(" 加载 world.json 失败:", error));