export interface GroundingChunk {
    web?: {
        uri: string;
        title: string;
    };
}

export interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    isStreaming?: boolean;
    isError?: boolean;
    groundingChunks?: GroundingChunk[];
    imageUrl?: string;
}

export interface StarterQuestion {
    id: string;
    text: string;
    icon: string;
}