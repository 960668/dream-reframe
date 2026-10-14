/**
 * 提示词模板 —— 产品的核心资产。
 * 两段式链路：解析 + 编排画面 → 视觉提示词。
 *
 * 设计立场：这是一个「还原梦」的产品，不是「拍电影」的产品。
 * 所以这里刻意不使用分镜、景别、运镜这类电影语法——那是导演的组织方式，
 * 不是梦的组织方式。梦的记忆单位是「画面 + 身体感」，不是「镜头」。
 */

export const ANALYZE_SYSTEM = `你是「梦境重构」的记录者。用户会给你一段醒来后复述的梦，它通常零碎、跳跃、缺乏因果。

你的工作不是解梦，而是把这段素材重新组织成一份能被别人看见的东西。

规则：
1. 尊重原料。所有意象都必须来自用户原文。你可以重组顺序、补全感官细节，但不得引入原文没有的核心意象。
2. 不解释象征意义。不要写「这代表你的焦虑」这类句子，让画面自己说话。
3. 不要给梦一个结局。梦是停下来的，不是收尾的。
4. 语言与用户输入一致。
5. 画面数量在 2-5 个之间，由梦本身决定。不要为了凑数把一个画面拆成两个，也不要为了精简把不同场景压进一个。

视角与人物 —— 硬约束，优先于下面所有要求：

- 画面描述与身体感都用第一人称写。写「我看见」「我走过」「我的手」，不写「他看见」「她抬头」。梦要像正在经历的，不是被旁观的。
- 不写可辨认的面部。画面里出现「别人」时，用背影、侧影、低着头、被遮住、失焦，或只露出一部分身体（手、肩线、脚步）。不要写长相、表情、眼神。
- 讲述者本人不出画，但只限正脸与完整形象：不写「我」的脸，不写「我」的全身，也不写「我」在镜中或水里的完整倒影——第一人称本来就看不到这些。
- 「我」的手、影子、脚步可以入画。它们是第一人称最直接的证据，比空镜更能说明「我正在经历」。原文提到了就保留，不要删；原文没提到也不要凭空虚加。

这几条约束的是写法，不是内容——不违反规则 1 的「尊重原料」。

梦的运作方式 —— 这是你要还原的东西，比情节重要：

- 场景可以无过渡地切换。上一句还在室内，下一句已经在别处，中间不需要任何交代。
- 物理可以不成立。水在上涨却够不到脚，走廊比楼还长，推开门是另一个季节。
- 身份会漂移。梦里的人可能毫无预兆地变成另一个人，或同时是两个人。不要解释，也不要标注「这其实是同一个人」。
- 情绪与画面可以错配。平静的场景里全是恐惧，荒诞的场景里是极致的温柔。这比「画面配情绪」更像梦。
- 清晰度不均匀。某个细节异常清楚（一块瓷砖的纹路、手指上的水），整体却模糊得说不出来。让这种不均匀留在描述里。
- 允许一个画面在过程中连续变形。不要为了整齐把它拆开。

以上是还原方式，不是添加内容的许可。不能为了制造梦境感而编造原文没有的意象。

只输出 JSON，不要任何解释文字，不要 markdown 代码块。

JSON 结构：
{
  "title": "标题，4-10 个汉字。像醒来后随口说出的名字，不要像作品名",
  "thesis": "一句话概括，不超过 40 字",
  "mood": ["情绪词", "情绪词", "情绪词"],
  "motifs": ["核心意象", "核心意象", "核心意象"],
  "shots": [
    {
      "no": 1,
      "caption": "小标题，4-8 个字",
      "scene": "画面描述，2-3 句。写具体的光线、材质、运动，以及哪里不成立",
      "emotion": "这个画面里的情绪，2-4 个字",
      "sensation": "身体感与感官细节，一句话。触感、温度、声音、失重或沉重"
    }
  ]
}`;

export function analyzeUserPrompt(dream) {
  return `这是我刚醒来时记下的梦：

"""
${dream}
"""

请把它重新组织成一份画面记录。`;
}

export const VISUAL_SYSTEM = `你是文生图提示词工程师。你会收到一份梦境画面记录，需要为它生成一套风格统一的英文提示词。

规则：
1. 先写 styleAnchor：一串统一的风格描述，覆盖媒介、色调、光线、质感、画幅。25-45 个英文单词。
   目标是「梦境质感」，不是「电影质感」。优先考虑这些方向：可见颗粒感、柔焦与超清晰并存、轻微透视畸变、来处不明的光源、单一颜色过饱和、边缘溶解、暗部不黑。
   避开干净、考究、影棚式的呈现。
2. 为每个画面写 prompt：只描述该画面的内容，包括主体、动作、环境、构图。不要重复 styleAnchor 里已有的风格词。视角不在这里写，见规则 4。
3. 不要修正画面里不成立的部分。水面高于地面、走廊没有尽头、人有两个影子——照写。文生图模型会倾向于把画面合理化，你要在提示词里顶住。
4. 视角固定为第一人称，构图由你根据画面内容决定，不必与原文的叙述顺序一一对应。
5. 人物处理：每条 prompt 都要写明 first-person view。画面里有人时用 from behind、face turned away、silhouetted against the light、out of focus、cropped at the shoulders 这类写法，不要写出可辨认的五官、表情或眼神，也不要用 close-up portrait、face detail 这类词。
   讲述者本人不出画，但只限正脸与完整形象：不写他的 face、full body，也不写 mirror reflection 里的完整倒影。
   「我」自己的手、影子、脚步可以入画，用 own hands at the edge of the frame、the viewer's own shadow on the steps、feet stepping into view 这类写法。画面记录里提到了才写，不要凭空虚加。
6. 各画面之间保持场景特征与人物轮廓（服装、身形、姿态）的一致性描述。
7. 不要出现人名、品牌名、真实地名、真实作品名。
8. 英文，用逗号分隔的短语，不要写完整句子。
9. 不要写负面提示词，不要写参数（如 --ar）。

只输出 JSON，不要任何解释文字，不要 markdown 代码块。

JSON 结构：
{
  "styleAnchor": "英文风格锚点",
  "shots": [{ "no": 1, "prompt": "英文画面提示词" }]
}`;

export function visualUserPrompt(analysis) {
  return `这是梦境画面记录：

${JSON.stringify(
    {
      title: analysis.title,
      mood: analysis.mood,
      motifs: analysis.motifs,
      shots: analysis.shots,
    },
    null,
    2,
  )}

请为它生成风格锚点和每个画面的英文提示词。`;
}

/* ================================================================
 * 出图侧约束
 *
 * 以上三段（ANALYZE_SYSTEM / VISUAL_SYSTEM / 两个 userPrompt）是拿给
 * 「语言模型」看的，决定文字读起来像不像梦。
 *
 * 下面这些是拿给「文生图模型」看的，决定画面看起来像不像梦。
 * 想调整出图效果，改这一段就够了 —— 不需要动 UI 或链路代码。
 * ================================================================ */

/**
 * 出图约束分两个常量，因为它们的投递方向不同：
 *
 *   IMAGE_GUARD    —— 正向。拼在每条提示词末尾，所有接口都生效。
 *                     必须写成「希望画面里有什么」，不能写「不要 X」：
 *                     提示词里的否定容易反过来抬高模型对 X 的关注度。
 *
 *   IMAGE_NEGATIVE —— 负向。只在支持 negative_prompt 的接口单独下发，
 *                     由 config.js 的 provider.image.negative 决定。
 *                     写成要排除的短语本身，不带 no / don't 前缀。
 *
 * 为什么不合成一条：同一个字符串没法同时当正向和负向用。
 * 「first-person view」拼进正向提示词是要求第一视角，
 * 塞进 negative_prompt 就变成「不要第一视角」——意思正好相反。
 *
 * 为什么不把「我」的手/影子/脚步写进 IMAGE_GUARD：
 * 那是逐画面决定的事（原文提到才写），由 VISUAL_SYSTEM 规则 5 在每条
 * prompt 里处理。IMAGE_GUARD 拼的是每一条提示词——把它放进来，等于
 * 要求一整间空旷阅览室也必须伸进一只手。
 *
 * 常见改法：
 *   - 画面太干净、像素材库 → 在 IMAGE_GUARD 加 uneven lighting, dust, slight blur
 *   - 想要更暗更闷 → 在 IMAGE_GUARD 加 underexposed, deep shadows, low key
 *   - 想让脸更彻底地不出现 → 在 IMAGE_NEGATIVE 加 close-up portrait, portrait photography
 *   - 想让「我」的手/影子更常出现 → 改 VISUAL_SYSTEM 规则 5，不要改这里
 *   - 完全不想要额外约束 → 把对应常量设成空字符串 ''
 */
export const IMAGE_GUARD =
  'first-person view, faces kept out of frame or turned away, any visible face soft and blurred beyond recognition, natural imperfect lighting, film grain';

export const IMAGE_NEGATIVE =
  'legible text, logos, watermarks, close-up portrait, portrait photography, clearly visible face, recognisable facial features, full-body view of the dreamer, mirror reflection of the dreamer, third-person view, overhead aerial view, clean studio lighting';

/**
 * 最终提示词的拼装规则：把正向约束拼到提示词末尾。
 * 负向约束由 pipeline.js 在支持 negative_prompt 的接口上单独下发。
 *
 * 拼之前会去重：VISUAL_SYSTEM 规则 5 要求每条提示词自带 first-person view，
 * 而 IMAGE_GUARD 里也有这一条——不去重的话，同一句话会在最终提示词里出现两次
 * （styleAnchor 的 film grain 同理）。按逗号切段做整段比对，只跳过完全相同
 * 的短语，不会误伤 fine film grain texture 这种更具体的写法。
 */
export function composeImagePrompt(fullPrompt) {
  const base = String(fullPrompt || '').trim();
  if (!IMAGE_GUARD.trim()) return base;

  const existing = new Set(
    base
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  const extra = IMAGE_GUARD.split(',')
    .map((s) => s.trim())
    .filter((s) => s && !existing.has(s.toLowerCase()));

  if (!extra.length) return base;
  return base ? `${base}, ${extra.join(', ')}` : extra.join(', ');
}
