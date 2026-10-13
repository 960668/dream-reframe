/**
 * 示例数据。
 * 用途有两个：给输入框提供灵感，以及在没有配置 Key 时也能看到完整交互。
 * 走示例路径时界面会明确标注「示例数据」，不会伪装成模型输出。
 */

export const SAMPLE_DREAMS = [
  `昨晚我梦见自己站在一个会呼吸的图书馆里。书架像潮水一样退去又涌回来，地面在缓慢下沉，露出湿掉的白色瓷砖。天花板不见了，上面是夜里的海。我走上了一道玻璃楼梯，踩上去会泛起水波，我的影子比我先一步往上走。后来所有的书页都飞了起来，朝海平线去，字落在水面上散开。`,
  `我赶上了末班地铁，车厢里只有我和一个抱着鱼缸的老人。列车一直不停站，窗外的站名都是我小学同学的名字。老人说他要坐到终点把鱼放回河里。我发现自己的书包里全是湿的沙子。`,
  `有个人在街角摆了个摊，牌子上写着"归还影子"。排队的人都捧着自己扁扁的影子。轮到我的时候，摊主说我的影子不是我的，让我明天再来。`,
];

export const DEMO_SAMPLE = {
  title: '退潮的图书馆',
  thesis: '一座和你一起呼吸的图书馆，最后把读过的字还给了海。',
  mood: ['失重', '潮汐般的安静', '舍不得'],
  motifs: ['会呼吸的书架', '退潮的瓷砖地', '玻璃楼梯', '消失了的天花板'],
  styleAnchor:
    'cinematic film still, muted teal and bone white palette, soft volumetric haze, wet reflective surfaces, 35mm anamorphic lens, shallow depth of field, quiet symmetrical composition, overcast diffused light',
  shots: [
    {
      no: 1,
      caption: '潮水退去',
      scene:
        '高挑的阅览室，书脊紧贴成两排深色崖壁。地面正缓慢下沉，露出湿漉漉的白色瓷砖，水痕在砖缝间留下等高线一样的纹路。',
      emotion: '屏息',
      camera: '固定机位，广角，极缓慢左移',
      prompt:
        'vast library reading room at low tide, bookshelves standing like dark cliffs on both sides, white tiled floor partly submerged, tide-line markings across the tiles, water draining away slowly, wide symmetrical composition, no people',
      fullPrompt:
        'vast library reading room at low tide, bookshelves standing like dark cliffs on both sides, white tiled floor partly submerged, tide-line markings across the tiles, water draining away slowly, wide symmetrical composition, no people, cinematic film still, muted teal and bone white palette, soft volumetric haze, wet reflective surfaces, 35mm anamorphic lens, shallow depth of field, quiet symmetrical composition, overcast diffused light',
    },
    {
      no: 2,
      caption: '书架呼吸',
      scene:
        '整排书架同时收拢又张开，像胸腔。缝隙里漏出很细的光。一本蓝皮书被气流托起来，停在两人高的位置慢慢旋转。',
      emotion: '奇异',
      camera: '中景，浅景深，视线跟着那本书',
      prompt:
        'rows of bookshelves breathing in and out like a ribcage, thin light leaking through the gaps, a single blue hardcover floating at head height, turning slowly in the air, medium shot, shallow depth of field',
      fullPrompt:
        'rows of bookshelves breathing in and out like a ribcage, thin light leaking through the gaps, a single blue hardcover floating at head height, turning slowly in the air, medium shot, shallow depth of field, cinematic film still, muted teal and bone white palette, soft volumetric haze, wet reflective surfaces, 35mm anamorphic lens, shallow depth of field, quiet symmetrical composition, overcast diffused light',
    },
    {
      no: 3,
      caption: '玻璃楼梯',
      scene:
        '一道玻璃楼梯向上延伸却看不到尽头，踩上去会泛起水波。你的影子落在台阶上，比你先一步往上走。',
      emotion: '错位',
      camera: '低角度仰拍，手持轻微晃动',
      prompt:
        'endless glass staircase ascending into haze, each step rippling like water when touched, a lone human shadow climbing one step ahead of the viewer, low angle, slight handheld motion',
      fullPrompt:
        'endless glass staircase ascending into haze, each step rippling like water when touched, a lone human shadow climbing one step ahead of the viewer, low angle, slight handheld motion, cinematic film still, muted teal and bone white palette, soft volumetric haze, wet reflective surfaces, 35mm anamorphic lens, shallow depth of field, quiet symmetrical composition, overcast diffused light',
    },
    {
      no: 4,
      caption: '字回到海里',
      scene:
        '天花板彻底消失，露出夜空下的海面。书页成片离开书脊，朝海平线飞去，字落在水面上散开，又慢慢聚拢。',
      emotion: '释然',
      camera: '远景，缓慢升镜',
      prompt:
        'library ceiling dissolved into a night sea, thousands of loose pages flying toward the horizon, letters scattering across the water surface and slowly reassembling, distant wide shot, camera rising slowly',
      fullPrompt:
        'library ceiling dissolved into a night sea, thousands of loose pages flying toward the horizon, letters scattering across the water surface and slowly reassembling, distant wide shot, camera rising slowly, cinematic film still, muted teal and bone white palette, soft volumetric haze, wet reflective surfaces, 35mm anamorphic lens, shallow depth of field, quiet symmetrical composition, overcast diffused light',
    },
  ],
};
