import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY!;

export const claude = new Anthropic({
  apiKey,
});

export default claude;
