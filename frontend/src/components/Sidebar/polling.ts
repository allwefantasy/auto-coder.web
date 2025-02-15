import { CodingEvent, INDEX_EVENT_TYPES, CodeBlock, UnmergeCodeBlock, ResponseData, ChatPanelProps } from './types';
import { getMessage } from './lang';

/**
 * pollEvents 函数的返回类型
 */
type PollEventsResult = {
  /** 轮询操作的最终状态 */
  final_status: 'completed' | 'failed';
  /** 轮询操作的内容或错误信息 */
  content: string;
};

/**
 * pollStreamResult 函数的返回类型
 */
type PollStreamResult = {
  /** 从流中累积的文本内容 */
  text: string;
  /** 流轮询操作的当前状态 */
  status: 'completed' | 'failed' | 'running';
};

/**
 * runBothPolls 函数的返回类型
 */
type RunBothPollsResult = {
  /** 两个轮询操作的最终状态 */
  status: 'completed' | 'failed';
  /** 流轮询的内容 */
  content: string;
  /** 事件轮询的内容 */
  eventsContent: string;
};

/**
 * 轮询特定请求的流结果更新。
 * 此函数会持续轮询直到操作完成或失败。
 * 在 human_as_model 模式下，它会处理特殊的人机交互界面。
 *
 * @param requestId - 要轮询的请求ID
 * @param onUpdate - 处理文本更新的回调函数
 * @param config - 包含 human_as_model 设置的配置对象
 * @param isWriteMode - 是否处于写入模式
 * @param callbacks - 包含UI回调函数的对象
 * @param callbacks.setActivePanel - 设置UI活动面板的函数
 * @param callbacks.setClipboardContent - 设置剪贴板内容的函数
 * @returns 返回一个解析为 PollStreamResult 对象的 Promise
 *
 * @example
 * const result = await pollStreamResult(
 *   'request123',
 *   (text) => console.log(text),
 *   { human_as_model: false },
 *   true,
 *   {
 *     setActivePanel: (panel) => {},
 *     setClipboardContent: (content) => {}
 *   }
 * );
 */
export const pollStreamResult = async (
  requestId: string,
  onUpdate: (text: string) => void,
  config: { human_as_model: boolean },
  isWriteMode: boolean,
  callbacks: {
    setActivePanel: ChatPanelProps['setActivePanel'];
    setClipboardContent: (content: string) => void;
  }
): Promise<PollStreamResult> => {
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

      if (config.human_as_model && !isWriteMode) {
        if ('value' in data.result && Array.isArray(data.result.value)) {
          const newText = data.result.value.join('');
          if (newText !== result) {
            result += newText;
          }
        }
        if (status === 'completed') {
          callbacks.setActivePanel('clipboard');
          callbacks.setClipboardContent(result);
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

/**
 * 轮询各种编码事件的端点并相应地处理它们。
 * 此函数处理不同类型的事件，如代码合并、生成更新和搜索操作。
 * 它会持续轮询直到完成或失败。
 *
 * @param requestId - 要轮询事件的请求ID
 * @param callbacks - 包含各种UI更新回调函数的对象
 * @param callbacks.addBotMessage - 向聊天添加机器人消息的函数
 * @param callbacks.setPreviewFiles - 更新UI预览文件的函数
 * @param callbacks.setActivePanel - 设置UI活动面板的函数
 * @param callbacks.setClipboardContent - 设置剪贴板内容的函数
 * @param callbacks.setPendingResponseEvent - 设置待处理响应事件的函数
 * @returns 返回一个解析为 PollEventsResult 对象的 Promise
 *
 * @example
 * const result = await pollEvents(
 *   'request123',
 *   {
 *     addBotMessage: (msg) => console.log(msg),
 *     setPreviewFiles: (files) => {},
 *     setActivePanel: (panel) => {},
 *     setClipboardContent: (content) => {},
 *     setPendingResponseEvent: (event) => {}
 *   }
 * );
 */
export const pollEvents = async (
  requestId: string,
  callbacks: {
    addBotMessage: (message: string) => void;
    setPreviewFiles: (files: { path: string; content: string }[]) => void;
    setActivePanel: ChatPanelProps['setActivePanel'];
    setClipboardContent: (content: string) => void;
    setPendingResponseEvent: (event: { requestId: string; eventData: CodingEvent } | null) => void;
  }
): Promise<PollEventsResult> => {
  let final_status: 'completed' | 'failed' = 'completed';
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
        callbacks.addBotMessage(getMessage('indexBuildStart'));
      }

      if (eventData.event_type === INDEX_EVENT_TYPES.BUILD_END) {
        await response_event("proceed");
        callbacks.addBotMessage(getMessage('indexBuildComplete'));
      }

      // Handle index filter events
      if (eventData.event_type === INDEX_EVENT_TYPES.FILTER_START) {
        await response_event("proceed");
        callbacks.addBotMessage(getMessage('filterStart'));
      }

      if (eventData.event_type === INDEX_EVENT_TYPES.FILTER_END) {
        await response_event("proceed");
        callbacks.addBotMessage(getMessage('filterComplete'));
      }

      if (eventData.event_type === INDEX_EVENT_TYPES.FILTER_FILE_SELECTED) {
        await response_event("proceed");
        try {
          const fileData = JSON.parse(eventData.data) as [string, string][];
          const selectedFiles = fileData.map(([file]) => file).join(', ');
          callbacks.addBotMessage(getMessage('fileSelected', { file: selectedFiles }));
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

        callbacks.setPreviewFiles(previewData);
        callbacks.setActivePanel('preview');
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

        callbacks.setPreviewFiles(previewData);
        callbacks.setActivePanel('preview');
      }

      if (eventData.event_type === 'code_generate_start') {
        await response_event("proceed");
        callbacks.addBotMessage(getMessage('codeGenerateStart'));
      }

      if (eventData.event_type === 'code_generate_end') {
        await response_event("proceed");
        callbacks.addBotMessage(getMessage('codeGenerateComplete'));
      }

      if (eventData.event_type === "code_rag_search_start") {
        await response_event("proceed");
        callbacks.addBotMessage(getMessage('ragSearchStart'));
      }

      if (eventData.event_type === "code_rag_search_end") {
        await response_event("proceed");
        callbacks.addBotMessage(getMessage('ragSearchComplete'));
      }

      if (eventData.event_type === 'code_human_as_model') {
        const result = JSON.parse(eventData.data);
        callbacks.setActivePanel('clipboard');
        callbacks.setClipboardContent(result.instruction);
        callbacks.setPendingResponseEvent({
          requestId: requestId,
          eventData: eventData
        });
        callbacks.addBotMessage(getMessage('copyInstructions'));
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

/**
 * 同时运行 pollEvents 和 pollStreamResult 来处理给定的请求。
 * 当你需要同时监控流输出和处理各种编码事件时，这个函数很有用。
 *
 * @param requestId - 要轮询的请求ID
 * @param onUpdate - 处理流文本更新的回调函数
 * @param callbacks - 包含事件处理回调函数的对象
 * @param config - 包含 human_as_model 设置的配置对象
 * @param isWriteMode - 是否处于写入模式
 * @returns 返回一个解析为包含两个轮询结果的 RunBothPollsResult 对象的 Promise
 *
 * @example
 * const result = await runBothPolls(
 *   'request123',
 *   (text) => console.log(text),
 *   {
 *     addBotMessage: (msg) => {},
 *     setPreviewFiles: (files) => {},
 *     setActivePanel: (panel) => {},
 *     setClipboardContent: (content) => {},
 *     setPendingResponseEvent: (event) => {}
 *   },
 *   { human_as_model: false },
 *   true
 * );
 */
export const runBothPolls = async (
  requestId: string,
  onUpdate: (text: string) => void,
  callbacks: Parameters<typeof pollEvents>[1],
  config: { human_as_model: boolean },
  isWriteMode: boolean
): Promise<RunBothPollsResult> => {
  try {
    const [eventsResult, streamResult] = await Promise.all([
      pollEvents(requestId, callbacks),
      pollStreamResult(requestId, onUpdate, config, isWriteMode, {
        setActivePanel: callbacks.setActivePanel,
        setClipboardContent: callbacks.setClipboardContent
      })
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
