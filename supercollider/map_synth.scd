// 启动 SuperCollider 服务器
s.waitForBoot({

    // 🎵 定义巴松（Bassoon）合成器
    SynthDef(\bassoon, { |freq = 440, amp = 0.3, dur = 2|
        var env = EnvGen.kr(Env.perc(0.1, dur), doneAction: 2);
        var sound = VarSaw.ar(freq, 0, 0.4) * env * amp;
        Out.ar(0, sound);
    }).add;

    // 🎺 定义小号（Trumpet）合成器
    SynthDef(\trumpet, { |freq = 440, amp = 0.3, dur = 2|
        var env = EnvGen.kr(Env.perc(0.05, dur), doneAction: 2);
        var sound = Saw.ar(freq) * env * amp;
        Out.ar(0, sound);
    }).add;

    // 🎧 监听 WebSocket 服务器发送的 OSC 消息
    OSCdef(\country_info, { |msg|
        var group = msg[1].asSymbol;  // 解析群体 (total, male, female)
        var value = msg[2].asFloat;   // 解析数值
        var freq = value * 10;        // 计算频率

        // ✅ 确保频率有效，避免播放错误
        if (freq.isNaN or: { freq <= 0 }) {
            freq = 440; // 默认频率 A4
        };

        // 🎼 选择乐器播放
        if (group == \total) {
            Synth(\bassoon, [\freq, freq]);
            Synth(\trumpet, [\freq, freq]);
            ("🎵 播放巴松 & 小号，频率: " ++ freq).postln;
        } {
            if (group == \female) {
                Synth(\trumpet, [\freq, freq]);
                ("🎺 仅播放小号，频率: " ++ freq).postln;
            } {
                if (group == \male) {
                    Synth(\bassoon, [\freq, freq]);
                    ("🎻 仅播放巴松，频率: " ++ freq).postln;
                };
            };
        };

    }, '/country_info');

    "✅ SuperCollider 服务器已启动，等待 OSC 消息...".postln;

});
