import { CodingEvent, ResponseData, PollResult, Message } from './ChatPanel';
import { getMessage } from './lang';

const INDEX_EVENT_TYPES = {
  BUILD_START: 'code_index_build_start',
  BUILD_END: 'code_index_build_end',
  FILTER_START: 'code_index_filter_start',
  FILTER_END: 'code_index_filter_end',
  FILTER_FILE_SELECTED: 'code_index_filter_file_selected'
} as const;

interface PollUtilsDependencies {
  config: {
    human_as_model: boolean;
    skip_build_index: boolean;
  };
  isWriteMode: boolean;
  setActivePanel: (panel: 'code' | 'filegroup' | 'preview' | 'clipboard') => void;
  setClipboardContent: (content: string) => void;
  setPreviewFiles: (files: { path: string; content: string }[]) => void;
  addBotMessage: (content: string) => string;
  setRequestId: (requestId: string) => void;
}

export const pollStreamResult = async (
  requestId: string,
  onUpdate: (text: string) => void,
  deps: PollUtilsDependencies
): Promise<PollResult> => {
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

      if (deps.config.human_as_model && !deps.isWriteMode) {
        if ('value' in data.result && Array.isArray(data.result.value)) {
          const newText = data.result.value.join('');
          if (newText !== result) {
            result += newText;
          }
        }
        if (status === 'completed') {
          deps.setActivePanel('clipboard');
          deps.setClipboardContent(result);
          onUpdate(getMessage("humanAsModelInstructions"));
          break;
        }

        if (status === 'running') {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        continue;
      }

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

export const runBothPolls = async (
  requestId: string,
  onUpdate: (text: string) => void,
  deps: PollUtilsDependencies
) => {
  try {
    const [eventsResult, streamResult] = await Promise.all([
      pollEvents(requestId, deps),
      pollStreamResult(requestId, onUpdate, deps)
    ]);

    const finalStatus = eventsResult.final_status === 'completed' && streamResult.status === 'completed'
      ? 'completed'
      : 'failed';

    return {
      status: finalStatus,
      content: streamResult.text,
      eventsContent: eventsResult.content
    };
  } catch (error) {
    console.error('Error in runBothPolls:', error);
    return {
      status: 'failed',
      content: 'Error running polls: ' + error,
      eventsContent: ''
    };
  }
};

export const pollEvents = async (
  requestId: string,
  deps: PollUtilsDependencies
) => {
  let final_status = 'completed';
  let content = '';
  
  while (true) {
    try {
      const response = await fetch('/api/event/get', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ request_id: requestId })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const eventData: CodingEvent = await response.json();

      if (!eventData) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      const response_event = async (response: string) => {
        await fetch('/api/event/response', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            request_id: requestId,
            event: eventData,
            response: response
          })
        });
      };

      if (eventData.event_type === 'code_start') {
        await response_event("proceed");
      }

      if (eventData.event_type === 'code_end') {
        await response_event("proceed");
        break;
      }

      if (eventData.event_type === 'code_error') {
        await response_event("proceed");
        final_status = 'failed';
        content = eventData.data;
        break;
      }

      if (eventData.event_type === INDEX_EVENT_TYPES.BUILD_START) {
        await response_event("proceed");
        deps.addBotMessage(getMessage('indexBuildStart'));
      }

      if (eventData.event_type === INDEX_EVENT_TYPES.BUILD_END) {
        await response_event("proceed");
        deps.addBotMessage(getMessage('indexBuildComplete'));
      }

      if (eventData.event_type === INDEX_EVENT_TYPES.FILTER_START) {
        await response_event("proceed");
        deps.addBotMessage(getMessage('filterStart'));
      }

      if (eventData.event_type === INDEX_EVENT_TYPES.FILTER_END) {
        await response_event("proceed");
        deps.addBotMessage(getMessage('filterComplete'));
      }

      if (eventData.event_type === INDEX_EVENT_TYPES.FILTER_FILE_SELECTED) {
        await response_event("proceed");
        try {
          const fileData = JSON.parse(eventData.data) as [string, string][];
          const selectedFiles = fileData.map(([file, reason]) => file).join(', ');
          deps.addBotMessage(getMessage('fileSelected', { file: selectedFiles }));
        } catch (e) {
          console.error('Failed to parse file selection data:', e);
        }
      }

      if (eventData.event_type === 'code_unmerge_result') {
        await response_event("proceed");
        const blocks = JSON.parse(eventData.data) as any[];
        const previewData = blocks.map((block: any) => ({
          path: block.file_path,
          content: `<<<<<<< SEARCH(${block.similarity})\n${block.head}\n=======\n${block.update}\n>>>>>>> REPLACE`
        }));
        deps.setPreviewFiles(previewData);
        deps.setActivePanel('preview');
        final_status = 'failed';
        content = "Code block merge failed";
        break;
      }

      if (eventData.event_type === 'code_merge_result') {
        await response_event("proceed");
        const blocks = JSON.parse(eventData.data) as any[];
        const previewData = blocks.map((block: any) => ({
          path: block.file_path,
          content: `<<<<<<< SEARCH(${block.similarity})\n${block.head}\n=======\n${block.update}\n>>>>>>> REPLACE`
        }));
        deps.setPreviewFiles(previewData);
        deps.setActivePanel('preview');
      }

      if (eventData.event_type === 'code_generate_start') {
        await response_event("proceed");
        deps.addBotMessage(getMessage('codeGenerateStart'));
      }

      if (eventData.event_type === 'code_generate_end') {
        await response_event("proceed");
        deps.addBotMessage(getMessage('codeGenerateComplete'));
      }

      if (eventData.event_type === "code_rag_search_start") {
        await response_event("proceed");
        deps.addBotMessage(getMessage('ragSearchStart'));
      }

      if (eventData.event_type === "code_rag_search_end") {
        await response_event("proceed");
        deps.addBotMessage(getMessage('ragSearchComplete'));
      }

      if (eventData.event_type === 'code_human_as_model') {
        const result = JSON.parse(eventData.data)
        deps.setActivePanel('clipboard');
        deps.setClipboardContent(result.instruction);
        deps.addBotMessage(getMessage('copyInstructions'));
        deps.setRequestId("");
      }
    } catch (error) {
      final_status = 'failed';
      content = 'Error polling events: ' + error;
      console.error('Error polling events:', error);
      break;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return { final_status, content };
};