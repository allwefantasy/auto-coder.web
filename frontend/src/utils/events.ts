interface CodingEvent {
    event_type: string;
    data: string;
}

interface ResponseData {
    result: {
        value: string[] | string;
    };
    status: 'running' | 'completed' | 'failed';
}

interface PollResult {
    text: string;
    status: 'running' | 'completed' | 'failed';
}

export const pollStreamResult = async (requestId: string, onUpdate: (text: string) => void): Promise<PollResult> => {
    let result = '';
    let status: 'running' | 'completed' | 'failed' = 'running';

    while (status === 'running') {
        try {
            const response = await fetch(`/api/result/${requestId}`);
            if (!response.ok) {
                status = 'failed';
                break;
            }

            const data: ResponseData = await response.json();
            status = data.status;

            if ('value' in data.result && Array.isArray(data.result.value)) {
                const newText = data.result.value.join('');
                if (newText !== result) {
                    result = newText;
                    onUpdate(result);
                }
            } else if ('value' in data.result && typeof data.result.value === 'string') {
                if (data.result.value !== result) {
                    result = data.result.value;
                    onUpdate(result);
                }
            }

            if (status === 'completed') {
                break;
            }

            if (status === 'running') {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.error('Error polling result:', error);
            status = 'failed';
        }
    }

    return { text: result, status };
};