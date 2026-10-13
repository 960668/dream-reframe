/**
 * 服务商预设。
 * 这里只放「接口地址 + 默认模型」这类公开信息，任何密钥都不进代码。
 *
 * cors: 该服务商是否允许浏览器直连。实测于 2026-10，方法是对 chat/completions
 * 发一次带 Origin 的 OPTIONS 预检，看是否返回 access-control-allow-origin。
 * 为 false 的服务商必须走本地代理 `node server.mjs`——这意味着部署到静态托管
 * （GitHub Pages 等）后无法使用，只能选 cors: true 的。
 */
export const PROVIDERS = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    keyHelp: 'https://platform.deepseek.com/api_keys',
    cors: true,
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    keyHelp: 'https://open.bigmodel.cn/usercenter/apikeys',
    cors: true,
  },
  {
    id: 'moonshot',
    name: 'Kimi (Moonshot)',
    baseURL: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
    keyHelp: 'https://platform.moonshot.cn/console/api-keys',
    cors: true,
  },
  {
    id: 'dashscope',
    name: '通义千问 (百炼)',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    keyHelp: 'https://bailian.console.aliyun.com/',
    cors: true,
  },
  {
    id: 'siliconflow',
    name: '硅基流动',
    baseURL: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen2.5-7B-Instruct',
    keyHelp: 'https://cloud.siliconflow.cn/account/ak',
    cors: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    keyHelp: 'https://platform.openai.com/api-keys',
    cors: false,
  },
  {
    id: 'custom',
    name: '自定义（任意 OpenAI 兼容接口）',
    baseURL: '',
    model: '',
    keyHelp: '',
    cors: null,
  },
];

export const STORAGE_KEY = 'dream-reframe:settings:v1';

/** 部署后改成你自己的仓库地址，页脚的链接会指向它。留空则隐藏该链接。 */
export const REPO_URL = 'https://github.com/960668/dream-reframe';
