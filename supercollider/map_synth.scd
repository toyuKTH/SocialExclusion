/*s.options.outDevice = "Noise Killer";*/
// 启动 SuperCollider 服务器
// (
// s.waitForBoot({
// 	b = Buffer.read(s, "C:/Users/Think/Desktop/background.wav");
	/*b = Buffer.read(s, Platform.resourceDir +/+ "sounds/a11wlk01.wav");*/

(
s.waitForBoot({
    //  确保文件路径正确
    var path = "E:\backgroud.wav";
    if (File.exists(path), {
        b = Buffer.read(s, path);
        s.sync;
        " Buffer 加载成功".postln;


		(
            Ndef(\drops, { |bufnum=0, rate=1, amp=0.5|
                PlayBuf.ar(1, bufnum, rate, loop: 1, doneAction: Done.freeSelf) * amp ! 2
            }).set(\bufnum, b.bufnum).play;
            Ndef(\drops).fadeTime = 3;
        );


    }, {
        "文件不存在，请检查路径".postln;
    });

    //  定义巴松（Bassoon）合成器
    SynthDef(\bassoon, { |freq = 440, amp = 0.3, dur = 2|
        var env = EnvGen.kr(Env.perc(0.1, dur), doneAction: 2);
        var sound = VarSaw.ar(freq, 0, 0.4) * env * amp;
		Out.ar(0, [sound,sound]);
    }).add;

    //  定义小号（Trumpet）合成器
    SynthDef(\trumpet, { |freq = 440, amp = 0.3, dur = 2|
        var env = EnvGen.kr(Env.perc(0.05, dur), doneAction: 2);
        var sound = Saw.ar(freq) * env * amp;
		Out.ar(0, [sound,sound]);
    }).add;
	(
		Ndef(\drops, { |bufnum=0, rate=1, amp=0.5|
			PlayBuf.ar(1, bufnum, rate, loop: 1, doneAction: Done.freeSelf) * amp ! 2 }).set(\bufnum, b.bufnum).play;
		Ndef(\drops).fadeTime = 3;
	);
    // 监听 WebSocket 服务器发送的 OSC 消息
    OSCdef(\country_info, { |msg|
        var group = msg[1].asSymbol;  // 解析群体 (total, male, female)
        var value = msg[2].asFloat;   // 解析数值
        var freq = value * 15;        // 计算频率
		var volume = -1 * value;
		value.postln;
		volume.dbamp.postln;
		Ndef(\drops).set(\amp, volume.dbamp);

        //  确保频率有效，避免播放错误
        if (freq.isNaN or: { freq <= 0 }) {
            freq = 440; // 默认频率 A4
        };

        // 选择乐器播放
        if (group == \total) {
            Synth(\bassoon, [\freq, freq]);
            Synth(\trumpet, [\freq, freq]);
            (" 播放巴松 & 小号，频率: " ++ freq).postln;
        } {
            if (group == \female) {
                Synth(\trumpet, [\freq, freq]);
                (" 仅播放小号，频率: " ++ freq).postln;
            } {
                if (group == \male) {
                    Synth(\bassoon, [\freq, freq]);
                    ("仅播放巴松，频率: " ++ freq).postln;
                };
            };
        };

    }, '/country_info');






	 //  监听 OSC 消息，控制背景音乐播放/停止
   OSCdef(\background_control, { |msg|
    var command = msg[1].asSymbol;
    command.postln;  // 打印收到的命令

    if (command == \play) {
        "▶️ 重新播放背景音乐".postln;
        Ndef(\drops).clear; // 清除之前的 Ndef，确保可以重新启动
        Ndef(\drops, { |bufnum=0, rate=1, amp=0.5|
            PlayBuf.ar(1, bufnum, rate, loop: 1, doneAction: Done.freeSelf) * amp ! 2;
        }).set(\bufnum, b.bufnum).play;
    } {
        if (command == \stop) {
            " 停止背景音乐".postln;
            Ndef(\drops).stop;
            Ndef(\drops).clear; // 释放资源，确保下次 `play` 能重新创建
        };
    };
}, '/background_control');

    "✅ SuperCollider 服务器已启动，等待 OSC 消息...".postln;

});
)

/*b = Buffer.read(s, Platform.resourceDir +/+ "sounds/a11wlk01.wav");*/


