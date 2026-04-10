/**
 * Mindverse AI 服务模块
 * 支持多种大模型：Claude、通义千问、文心一言、GLM、Kimi、DeepSeek 等
 */

import axios, { AxiosInstance } from 'axios';

// ============= 类型定义 =============

export interface AiRequest {
  systemPrompt: string;
  userContent: string;
  modelVersion: string;
}

export interface AiResponse {
  success: boolean;
  content?: string;
  error?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface ModelConfig {
  provider: 'anthropic' | 'aliyun' | 'baidu' | 'zhipu' | 'moonshot' | 'deepseek' | 'spark' | 'hunyuan';
  modelName: string;
  apiKey: string;
  baseUrl?: string;
}

// ============= 统一接口 =============

export interface IAiAdapter {
  chat(request: AiRequest): Promise<AiResponse>;
  validate(): Promise<boolean>;
}

// ============= Claude (Anthropic) =============

export class AnthropicAdapter implements IAiAdapter {
  private client: AxiosInstance;

  constructor(config: ModelConfig) {
    this.client = axios.create({
      baseURL: 'https://api.anthropic.com/v1',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      timeout: 120000
    });
  }

  async chat(request: AiRequest): Promise<AiResponse> {
    try {
      const response = await this.client.post('/messages', {
        model: request.modelVersion,
        max_tokens: 4096,
        system: request.systemPrompt,
        messages: [{ role: 'user', content: request.userContent }]
      });

      return {
        success: true,
        content: response.data.content[0].text,
        usage: {
          inputTokens: response.data.usage.input_tokens,
          outputTokens: response.data.usage.output_tokens
        }
      };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error?.message || error.message };
    }
  }

  async validate(): Promise<boolean> {
    try {
      await this.client.post('/messages', { model: 'claude-3-sonnet-20240229', max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] });
      return true;
    } catch { return false; }
  }
}

// ============= 通义千问 (Aliyun) =============

export class AliyunAdapter implements IAiAdapter {
  private client: AxiosInstance;
  private modelName: string;

  constructor(config: ModelConfig) {
    this.modelName = config.modelName || 'qwen-turbo';
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      timeout: 120000
    });
  }

  async chat(request: AiRequest): Promise<AiResponse> {
    try {
      const response = await this.client.post('/chat/completions', {
        model: this.modelName,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userContent }
        ]
      });

      return {
        success: true,
        content: response.data.choices[0].message.content
      };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error?.message || error.message };
    }
  }

  async validate(): Promise<boolean> {
    try {
      await this.client.post('/chat/completions', { model: this.modelName, messages: [{ role: 'user', content: 'Hi' }] });
      return true;
    } catch { return false; }
  }
}

// ============= 文心一言 (Baidu) =============

export class BaiduAdapter implements IAiAdapter {
  private accessToken: string = '';
  private modelName: string;
  private apiKey: string;
  private secretKey: string;

  constructor(config: ModelConfig) {
    this.modelName = config.modelName || 'ernie-4.0-8k-latest';
    // 百度使用 apiKey + secretKey 获取 access_token
    const [ak, sk] = config.apiKey.split('|');
    this.apiKey = ak || '';
    this.secretKey = sk || '';
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    try {
      const response = await axios.post(
        `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${this.apiKey}&client_secret=${this.secretKey}`
      );
      this.accessToken = response.data.access_token;
      return this.accessToken;
    } catch {
      throw new Error('获取百度 access_token 失败');
    }
  }

  async chat(request: AiRequest): Promise<AiResponse> {
    try {
      const token = await this.getAccessToken();
      const response = await axios.post(
        `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${this.modelName}?access_token=${token}`,
        {
          messages: [
            { role: 'user', content: request.systemPrompt + '\n\n' + request.userContent }
          ]
        }
      );

      if (response.data.error_code) {
        return { success: false, error: response.data.error_msg };
      }

      return { success: true, content: response.data.result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async validate(): Promise<boolean> {
    try {
      await this.getAccessToken();
      return true;
    } catch { return false; }
  }
}

// ============= 智谱 GLM (Zhipu) =============

export class ZhipuAdapter implements IAiAdapter {
  private client: AxiosInstance;
  private modelName: string;

  constructor(config: ModelConfig) {
    this.modelName = config.modelName || 'glm-4-flash';
    this.client = axios.create({
      baseURL: 'https://open.bigmodel.cn/api/paas/v4',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      timeout: 120000
    });
  }

  async chat(request: AiRequest): Promise<AiResponse> {
    try {
      const response = await this.client.post('/chat/completions', {
        model: this.modelName,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userContent }
        ]
      });

      return {
        success: true,
        content: response.data.choices[0].message.content
      };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error?.message || error.message };
    }
  }

  async validate(): Promise<boolean> {
    try {
      await this.client.post('/chat/completions', { model: this.modelName, messages: [{ role: 'user', content: 'Hi' }] });
      return true;
    } catch { return false; }
  }
}

// ============= Kimi (Moonshot) =============

export class MoonshotAdapter implements IAiAdapter {
  private client: AxiosInstance;
  private modelName: string;

  constructor(config: ModelConfig) {
    this.modelName = config.modelName || 'moonshot-v1-8k';
    this.client = axios.create({
      baseURL: 'https://api.moonshot.cn/v1',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      timeout: 120000
    });
  }

  async chat(request: AiRequest): Promise<AiResponse> {
    try {
      const response = await this.client.post('/chat/completions', {
        model: this.modelName,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userContent }
        ]
      });

      return {
        success: true,
        content: response.data.choices[0].message.content
      };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error?.message || error.message };
    }
  }

  async validate(): Promise<boolean> {
    try {
      await this.client.post('/chat/completions', { model: this.modelName, messages: [{ role: 'user', content: 'Hi' }] });
      return true;
    } catch { return false; }
  }
}

// ============= DeepSeek =============

export class DeepSeekAdapter implements IAiAdapter {
  private client: AxiosInstance;
  private modelName: string;

  constructor(config: ModelConfig) {
    this.modelName = config.modelName || 'deepseek-chat';
    this.client = axios.create({
      baseURL: 'https://api.deepseek.com/v1',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      timeout: 120000
    });
  }

  async chat(request: AiRequest): Promise<AiResponse> {
    try {
      const response = await this.client.post('/chat/completions', {
        model: this.modelName,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userContent }
        ]
      });

      return {
        success: true,
        content: response.data.choices[0].message.content
      };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error?.message || error.message };
    }
  }

  async validate(): Promise<boolean> {
    try {
      await this.client.post('/chat/completions', { model: this.modelName, messages: [{ role: 'user', content: 'Hi' }] });
      return true;
    } catch { return false; }
  }
}

// ============= 讯飞星火 (Spark) =============

export class SparkAdapter implements IAiAdapter {
  private modelName: string;
  private apiKey: string;
  private apiSecret: string;
  private appId: string;

  constructor(config: ModelConfig) {
    this.modelName = config.modelName || 'Spark-3.5';
    const parts = config.apiKey.split('|');
    this.appId = parts[0] || '';
    this.apiKey = parts[1] || '';
    this.apiSecret = parts[2] || '';
  }

  private generateAuthUrl(): string {
    const host = 'wss://spark-api.xf-yun.com/v3.5/chat';
    const date = new Date().toUTCString();
    const signatureOrigin = `host: spark-api.xf-yun.com\ndate: ${date}\nGET /v3.5/chat HTTP/1.1`;
    // 简化处理，实际需要 HMAC-SHA256 签名
    return `wss://spark-api.xf-yun.com/v3.5/chat?authorization=&host=spark-api.xf-yun.com&date=${encodeURIComponent(date)}`;
  }

  async chat(request: AiRequest): Promise<AiResponse> {
    // 讯飞星火使用 WebSocket，这里简化处理
    return {
      success: false,
      error: '讯飞星火需要 WebSocket 支持，请使用其他模型或等待后续更新'
    };
  }

  async validate(): Promise<boolean> {
    return false; // 需要 WebSocket
  }
}

// ============= 腾讯混元 (Hunyuan) =============

export class HunyuanAdapter implements IAiAdapter {
  private client: AxiosInstance;
  private modelName: string;

  constructor(config: ModelConfig) {
    this.modelName = config.modelName || 'hunyuan';
    this.client = axios.create({
      baseURL: 'https://hunyuan.cloud.tencent.com',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      timeout: 120000
    });
  }

  async chat(request: AiRequest): Promise<AiResponse> {
    try {
      const response = await this.client.post('/v1/chat/completions', {
        model: this.modelName,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userContent }
        ]
      });

      return {
        success: true,
        content: response.data.choices[0].message.content
      };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error?.message || error.message };
    }
  }

  async validate(): Promise<boolean> {
    try {
      await this.client.post('/v1/chat/completions', { model: this.modelName, messages: [{ role: 'user', content: 'Hi' }] });
      return true;
    } catch { return false; }
  }
}

// ============= 工厂函数 =============

export function createAiAdapter(config: ModelConfig): IAiAdapter {
  switch (config.provider) {
    case 'anthropic':
      return new AnthropicAdapter(config);
    case 'aliyun':
      return new AliyunAdapter(config);
    case 'baidu':
      return new BaiduAdapter(config);
    case 'zhipu':
      return new ZhipuAdapter(config);
    case 'moonshot':
      return new MoonshotAdapter(config);
    case 'deepseek':
      return new DeepSeekAdapter(config);
    case 'spark':
      return new SparkAdapter(config);
    case 'hunyuan':
      return new HunyuanAdapter(config);
    default:
      throw new Error(`不支持的模型提供商: ${config.provider}`);
  }
}

// ============= 向后兼容 =============

export class AiService {
  private adapter: IAiAdapter;

  constructor(config: ModelConfig) {
    this.adapter = createAiAdapter(config);
  }

  async processContent(request: AiRequest): Promise<AiResponse> {
    return this.adapter.chat(request);
  }

  async validateApiKey(): Promise<boolean> {
    return this.adapter.validate();
  }
}
