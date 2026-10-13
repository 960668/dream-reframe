/**
 * 示例数据。
 * 用途有两个：给输入框提供灵感，以及在没有配置 Key 时也能看到完整交互。
 * 走示例路径时界面会明确标注「示例数据」，不会伪装成模型输出。
 *
 * 提示词与 VISUAL_SYSTEM 的输出规则一致：画面语法（构图、视角允许），
 * 不含景别与运镜；风格锚点走「梦境质感」，不走电影质感。
 *
 * 注意：assets/ 下的两张示例成片（demo-shot-01/04.png）由早期版本的
 * 电影语法锚点生成，与下方当前的提示词并非同源。用当前锚点重新生成
 * 的待办记录在 docs/ROADMAP.md 的技术债一节。
 */

export const SAMPLE_DREAMS = [
  `昨晚我梦见自己站在一个会呼吸的图书馆里。书架像潮水一样退去又涌回来，地面在缓慢下沉，露出湿掉的白色瓷砖。天花板不见了，上面是夜里的海。我走上了一道玻璃楼梯，踩上去会泛起水波，我的影子比我先一步往上走。后来所有的书页都飞了起来，朝海平线去，字落在水面上散开。`,
  `我赶上了末班地铁，车厢里只有我和一个抱着鱼缸的老人。列车一直不停站，窗外的站名都是我小学同学的名字。老人说他要坐到终点把鱼放回河里。我发现自己的书包里全是湿的沙子。`,
  `有个人在街角摆了个摊，牌子上写着"归还影子"。排队的人都捧着自己扁扁的影子。轮到我的时候，摊主说我的影子不是我的，让我明天再来。`,
];

const DREAM_ANCHOR =
  'grainy dream photograph, muted teal and bone white palette, soft focus bleeding into hyper-sharp detail, subtle perspective distortion, light with no visible source, edges dissolving into darkness that never turns fully black, film grain';

export const DEMO_SAMPLE = {
  title: '退潮的图书馆',
  thesis: '一座和你一起呼吸的图书馆，最后把读过的字还给了海。',
  mood: ['失重', '潮汐般的安静', '舍不得'],
  motifs: ['会呼吸的书架', '退潮的瓷砖地', '玻璃楼梯', '消失了的天花板'],
  styleAnchor: DREAM_ANCHOR,
  shots: [
    {
      no: 1,
      caption: '潮水退去',
      scene:
        '高挑的阅览室，书脊紧贴成两排深色崖壁。地面正缓慢下沉，露出湿漉漉的白色瓷砖，水痕在砖缝间留下等高线一样的纹路。',
      emotion: '屏息',
      sensation: '脚底是干的，却听得见水在退。空气里有铁锈和湿纸的味道。',
      prompt:
        'vast library reading room at low tide, bookshelves standing like dark cliffs on both sides, white tiled floor partly submerged, tide-line markings across the tiles, water draining away slowly, symmetrical composition, no people',
      demoImage: 'assets/demo-shot-01.png',
      fullPrompt: `vast library reading room at low tide, bookshelves standing like dark cliffs on both sides, white tiled floor partly submerged, tide-line markings across the tiles, water draining away slowly, symmetrical composition, no people, ${DREAM_ANCHOR}`,
    },
    {
      no: 2,
      caption: '书架呼吸',
      scene:
        '整排书架同时收拢又张开，像胸腔。缝隙里漏出很细的光。一本蓝皮书被气流托起来，停在两人高的位置慢慢旋转。',
      emotion: '奇异',
      sensation: '抬头追它的时候脖子一点也不酸。风是从书页里出来的，不冷。',
      prompt:
        'rows of bookshelves breathing in and out like a ribcage, thin light leaking through the gaps, a single blue hardcover floating at head height, turning slowly in the air, shallow depth of field',
      fullPrompt: `rows of bookshelves breathing in and out like a ribcage, thin light leaking through the gaps, a single blue hardcover floating at head height, turning slowly in the air, shallow depth of field, ${DREAM_ANCHOR}`,
    },
    {
      no: 3,
      caption: '玻璃楼梯',
      scene:
        '一道玻璃楼梯向上延伸却看不到尽头，踩上去会泛起水波。你的影子落在台阶上，比你先一步往上走。',
      emotion: '错位',
      sensation: '每踩一级，身体就轻一点。影子先走，我后到，可我们明明是一起动的。',
      prompt:
        'endless glass staircase ascending into haze, each step rippling like water when touched, a lone human shadow climbing one step ahead of the viewer',
      fullPrompt: `endless glass staircase ascending into haze, each step rippling like water when touched, a lone human shadow climbing one step ahead of the viewer, ${DREAM_ANCHOR}`,
    },
    {
      no: 4,
      caption: '字回到海里',
      scene:
        '天花板彻底消失，露出夜空下的海面。书页成片离开书脊，朝海平线飞去，字落在水面上散开，又慢慢聚拢。',
      emotion: '释然',
      sensation: '离得越远，越能感觉到那些字擦过手背。海水不凉，像刚洗过的手。',
      prompt:
        'library ceiling dissolved into a night sea, thousands of loose pages flying toward the horizon, letters scattering across the water surface and slowly reassembling, seen from far away',
      demoImage: 'assets/demo-shot-04.png',
      fullPrompt: `library ceiling dissolved into a night sea, thousands of loose pages flying toward the horizon, letters scattering across the water surface and slowly reassembling, seen from far away, ${DREAM_ANCHOR}`,
    },
  ],
};
