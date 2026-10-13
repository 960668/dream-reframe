/**
 * 服务商预设。
 * 这里只放「接口地址 + 默认模型」这类公开信息，任何密钥都不进代码。
 *
 * cors: 该服务商是否允许浏览器直连。实测于 2026-10，方法是对 chat/completions
 * 发一次带 Origin 的 OPTIONS 预检，看是否返回 access-control-allow-origin。
 * 为 false 的服务商必须走本地代理 `node server.mjs`——这意味着部署到静态托管
 * （GitHub Pages 等）后无法使用，只能选 cors: true 的。
 *
 * image: 出图配置，为 null 表示该服务商没有 OpenAI 兼容的图像接口。
 *   model        默认图像模型
 *   sizeKey      尺寸字段名。智谱用 size，硅基流动用 image_size，两家不一样。
 *   sizePreset   该服务商确定支持的尺寸，填错会被接口拒绝
 *   negative     是否支持 negative_prompt（支持的话，出图约束会单独下发而不是拼进提示词）
 */
export const PROVIDERS = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    keyHelp: 'https://platform.deepseek.com/api_keys',
    cors: true,
    image: null,
  },
  {
    id: 'zhipu',
    name: '智谱 GLM（出图免费）',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    keyHelp: 'https://open.bigmodel.cn/usercenter/apikeys',
    cors: true,
    // cogview-3-flash 是智谱官方标注免费的图像模型，注册只要手机号，成本为 0。
    image: {
      model: 'cogview-3-flash',
      sizeKey: 'size',
      sizePreset: ['1024x1024', '1344x768', '1152x864', '768x1344', '864x1152', '1440x720', '720x1440'],
      negative: false,
    },
  },
  {
    id: 'moonshot',
    name: 'Kimi (Moonshot)',
    baseURL: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
    keyHelp: 'https://platform.moonshot.cn/console/api-keys',
    cors: true,
    image: null,
  },
  {
    id: 'dashscope',
    name: '通义千问 (百炼)',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    keyHelp: 'https://bailian.console.aliyun.com/',
    cors: true,
    // 通义的文生图是另一套异步接口，不是 OpenAI 兼容形状，这里不接。
    image: null,
  },
  {
    id: 'siliconflow',
    name: '硅基流动（出图免费）',
    baseURL: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen2.5-7B-Instruct',
    keyHelp: 'https://cloud.siliconflow.cn/account/ak',
    cors: true,
    // Kwai-Kolors/Kolors 在硅基流动价格页标注输出免费。需先完成实名认证。
    image: {
      model: 'Kwai-Kolors/Kolors',
      sizeKey: 'image_size',
      sizePreset: ['1024x1024', '768x1024', '1024x768', '576x1024', '1024x576'],
      negative: true,
    },
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    keyHelp: 'https://platform.openai.com/api-keys',
    cors: false,
    image: {
      model: 'gpt-image-1',
      sizeKey: 'size',
      sizePreset: ['1024x1024', '1536x1024', '1024x1536'],
      negative: false,
    },
  },
  {
    id: 'custom',
    name: '自定义（任意 OpenAI 兼容接口）',
    baseURL: '',
    model: '',
    keyHelp: '',
    cors: null,
    image: {
      model: '',
      sizeKey: 'size',
      sizePreset: ['1024x1024', '1344x768', '1152x864', '768x1344', '864x1152'],
      negative: false,
    },
  },
];

/** 尺寸字段名的可选项。智谱用 size，硅基流动用 image_size，填错接口会报参数错误。 */
export const SIZE_KEYS = [
  { id: 'size', label: 'size（智谱 / OpenAI / 多数接口）' },
  { id: 'image_size', label: 'image_size（硅基流动）' },
];

export const STORAGE_KEY = 'dream-reframe:settings:v1';

/** 默认尺寸。1024x1024 是各家都支持的最小公约数。 */
export const DEFAULT_IMAGE_SIZE = '1024x1024';

/** 部署后改成你自己的仓库地址，页脚的链接会指向它。留空则隐藏该链接。 */
export const REPO_URL = 'https://github.com/960668/dream-reframe';
