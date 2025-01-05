import { CodingEvent, INDEX_EVENT_TYPES, Message } from './types';

export const pollEvents = async (
  requestId: string,
  addBotMessage: (content: string) => string,
  setPreviewFiles: (files: { path: string; content: string }[]) => void,
  setActivePanel: (panel: string) => void,
  setClipboardContent: (content: string) => void,
  setPendingResponseEvent: (event: {
    requestId: string;
    eventData: CodingEvent;
  } | null) => void,
  setSendLoading: (loading: boolean) => void
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

      console.log('Received event:', eventData);

      const response_event = async (response: string) => {
        console.log('Response event:', response);
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

      // Handle specific event types
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

      // Handle index build events
      if (eventData.event_type === INDEX_EVENT_TYPES.BUILD_START) {
        await response_event("proceed");
        addBotMessage('indexBuildStart');
      }

      if (eventData.event_type === INDEX_EVENT_TYPES.BUILD_END) {
        await response_event("proceed");
        addBotMessage('indexBuildComplete');
      }

      // Handle index filter events
      if (eventData.event_type === INDEX_EVENT_TYPES.FILTER_START) {
        await response_event("proceed");
        addBotMessage('filterStart');
      }

      if (eventData.event_type === INDEX_EVENT_TYPES.FILTER_END) {
        await response_event("proceed");
        addBotMessage('filterComplete');
      }

      if (eventData.event_type === INDEX_EVENT_TYPES.FILTER_FILE_SELECTED) {
        await response_event("proceed");
        try {
          const fileData = JSON.parse(eventData.data) as [string, string][];
          const selectedFiles = fileData.map(([file, reason]) => file).join(', ');
          addBotMessage('fileSelected', { file: selectedFiles });
        } catch (e) {
          console.error('Failed to parse file selection data:', e);
        }
      }

      if (eventData.event_type === 'code_unmerge_result') {
        await response_event("proceed");
        const blocks = JSON.parse(eventData.data) as UnmergeCodeBlock[];
        console.log('Received unmerged code blocks:', blocks);

        const previewData = blocks.map(block => ({
          path: block.file_path,
          content: `<<<<<<< SEARCH(${block.similarity})\n${block.head}\n=======\n${block.update}\n>>>>>>> REPLACE`
        }));

        setPreviewFiles(previewData);
        setActivePanel('preview');
        final_status = 'failed';
        content = "Code block merge failed";
        break;
      }

      if (eventData.event_type === 'code_merge_result') {
        await response_event("proceed");
        const blocks = JSON.parse(eventData.data) as CodeBlock[];
        console.log('Received code blocks:', blocks);

        const previewData = blocks.map(block => ({
          path: block.file_path,
          content: `<<<<<<< SEARCH(${block.similarity})\n${block.head}\n=======\n${block.update}\n>>>>>>> REPLACE`
        }));

        setPreviewFiles(previewData);
        setActivePanel('preview');
      }

      if (eventData.event_type === 'code_generate_start') {
        await response_event("proceed");
        addBotMessage('codeGenerateStart');
      }

      if (eventData.event_type === 'code_generate_end') {
        await response_event("proceed");
        addBotMessage('codeGenerateComplete');
      }

      if (eventData.event_type === "code_rag_search_start") {
        await response_event("proceed");
        addBotMessage('ragSearchStart');
      }

      if (eventData.event_type === "code_rag_search_end") {
        await response_event("proceed");
        addBotMessage('ragSearchComplete');
      }

      if (eventData.event_type === 'code_human_as_model') {
        const result = JSON.parse(eventData.data)
        setActivePanel('clipboard');
        setClipboardContent(result.instruction);
        setPendingResponseEvent({
          requestId: requestId,
          eventData: eventData
        });
        addBotMessage('copyInstructions');
        setSendLoading(false)
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