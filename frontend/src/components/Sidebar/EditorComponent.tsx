import React, { useState } from 'react';
import { Editor, loader } from '@monaco-editor/react';
import { uploadImage } from '../../services/api';
import { CompletionItem, EnhancedCompletionItem } from './types';
import eventBus, { EVENTS } from '../../services/eventBus';
import { NewChatEventData, EditorMentionsEventData, ToggleInputFullscreenEventData, FileGroupSelectFocusEventData, ToggleWriteModeEventData, HotkeyEventData, SendMessageEventData } from '../../services/event_bus_data';
import { getMessage } from '../../lang';
// 导入 monaco 编辑器类型
import * as monaco from 'monaco-editor';

// 模块级变量，用于跟踪CompletionItemProvider是否已注册
let isProviderRegistered = false;

// 移除冲突的类型声明，使用 monaco-editor 包提供的类型
// declare global {
//   interface Window {
//     MonacoEnvironment: {
//       getWorkerUrl: (moduleId: string, label: string) => string;
//     };
//   }
// }

loader.config({
  paths: {
    vs: '/monaco-editor/min/vs'
  },
  'vs/nls': {
    availableLanguages: {
      '*': 'zh-cn'
    }
  }
});

// CSS 样式定义 - 将在组件加载时注入
const mentionStyles = `
.monaco-mention {
  background-color: rgba(73, 156, 255, 0.2);
  border-radius: 3px;
  padding: 2px 4px;
  font-weight: bold;
  color: #499cff;
  cursor: pointer;
}

.monaco-mention-widget {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  margin: 0 2px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
}

.mention-widget {
  background-color: rgba(73, 156, 255, 0.2);
  color: #499cff;
  border: 1px solid rgba(73, 156, 255, 0.4);
}
`;

interface EditorComponentProps {
  isMaximized: boolean;
  onEditorDidMount: (editor: any, monaco: any) => void;
  /** 编辑器的初始值 */
  defaultValue?: string;
  /** 切换编辑器最大化/最小化状态 */
  onToggleMaximize: () => void;
  /** 当点击 mention 项时的回调 */
  onMentionClick?: (type: 'file' | 'symbol', text: string, item?: EnhancedCompletionItem) => void;
  /** 面板ID */
  panelId?: string;
  /** 是否为激活面板 */
  isActive?: boolean;
}

// Mention 数据接口
interface MentionData {
  id: string;
  range: any; // monaco.Range
  type: 'file' | 'symbol';
  text: string;
  path: string;
  decorationId?: string;
  item: EnhancedCompletionItem;
}

/**
 * 代码编辑器组件
 * 提供了代码编辑、自动完成等功能
 */
const EditorComponent: React.FC<EditorComponentProps> = ({
  isMaximized,
  onEditorDidMount,
  defaultValue = '',
  onToggleMaximize,
  onMentionClick,
  panelId,
  isActive = true, // 默认为激活状态
}) => {
  // 添加一个ref来存储editor的引用
  const editorRef = React.useRef<any>(null);

  // 添加一个ref来存储编辑器容器的引用
  const editorContainer = React.useRef<HTMLDivElement>(null);
  // 存储所有mention项的引用
  const mentionsRef = React.useRef<MentionData[]>([]);
  // 存储当前装饰IDs的引用
  const decorationsRef = React.useRef<string[]>([]);

  // 自定义发送消息函数
  const handleSendMessage = React.useCallback((text?: string) => {
    // 使用eventBus发送消息
    eventBus.publish(EVENTS.CHAT.SEND_MESSAGE, new SendMessageEventData(text, panelId));
  }, [panelId]);

  // 更新mention装饰
  const updateMentionDecorations = React.useCallback(() => {
    if (!editorRef.current) return;

      const decorations = mentionsRef.current.map(mention => ({
        range: mention.range,
        options: {
          inlineClassName: 'monaco-mention',
          hoverMessage: { value: `**${mention.type === 'file' ? getMessage('file') : getMessage('symbol')}**: ${mention.path}` },
          stickiness: monaco.editor.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges
        }
      }));

    decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, decorations);

    // 更新每个mention的decorationId
    mentionsRef.current.forEach((mention, index) => {
      mention.decorationId = decorationsRef.current[index];
    });

    // 通过 eventBus 发布 mentions 变化事件
    eventBus.publish(EVENTS.EDITOR.MENTIONS_CHANGED, new EditorMentionsEventData(mentionsRef.current.map(m => ({
      type: m.type,
      text: m.text,
      path: m.path,
      item: m.item
    })), panelId));
  }, [panelId]);

  // 处理内容变化，更新mention位置
  const handleContentChange = React.useCallback(() => {
    if (!editorRef.current) return;

    // 检查每个mention是否仍然有效
    const model = editorRef.current.getModel();
    const validMentions = mentionsRef.current.filter(mention => {
      // 获取当前range中的文本
      const text = model.getValueInRange(mention.range);
      // 检查文本是否仍然是mention格式
      return text.startsWith('@') && text.includes(mention.text);
    });

    // 更新mentions列表
    mentionsRef.current = validMentions;
    // 更新装饰
    updateMentionDecorations();
  }, [updateMentionDecorations]);

  // 添加一个新的mention
  const addMention = React.useCallback((range: any, type: 'file' | 'symbol', text: string, path: string, item: EnhancedCompletionItem) => {
    const id = `mention-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // 创建新的mention数据
    const mentionData: MentionData = {
      id,
      range,
      type,
      text,
      path,
      item
    };

    // 添加到mention列表
    mentionsRef.current.push(mentionData);

    // 更新装饰
    updateMentionDecorations();

    return mentionData;
  }, [updateMentionDecorations]);

  
  const handleImageUpload = async (file: File) => {
    try {
      // 添加上传中状态反馈
      const editor = editorRef.current;
      if (editor) {
        const position = editor.getPosition();
        const loadingId = editor.executeEdits('', [{
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          ),
          text: `![${getMessage('uploading')}...]()  `,
          forceMoveMarkers: true
        }]);

        // 上传图片
        const response = await uploadImage(file);
        // console.log('Image upload response:', response);
        if (response.success) {
          // 获取当前光标位置
          const currentPosition = editor.getPosition();

          // 查找上传中文本的位置
          const model = editor.getModel();
          const content = model.getValue();
          const loadingTextPos = content.indexOf(`![${getMessage('uploading')}...]()`)

          if (loadingTextPos !== -1) {
            // 计算行和列
            let line = 1;
            let col = 1;
            for (let i = 0; i < loadingTextPos; i++) {
              if (content[i] === '\n') {
                line++;
                col = 1;
              } else {
                col++;
              }
            }

            // 替换上传中文本
            const loadingText = `![${getMessage('uploading')}...]()`;
            editor.executeEdits('', [{
              range: new monaco.Range(
                line,
                col,
                line,
                col + loadingText.length
              ),
              text: `<_image_>${response.path}</_image_>`,
              forceMoveMarkers: true
            }]);
          } else {
            // 如果找不到上传中文本，则在当前位置插入
            editor.executeEdits('', [{
              range: new monaco.Range(
                currentPosition.lineNumber,
                currentPosition.column,
                currentPosition.lineNumber,
                currentPosition.column
              ),
              text: `<_image_>${response.path}</_image_>`,
              forceMoveMarkers: true
            }]);
          }
        } else {
          console.error(getMessage('uploadFailed'), response);
        }
      }
    } catch (error) {
      console.error(getMessage('uploadFailed'), error);

      // 显示错误信息
      const editor = editorRef.current;
      if (editor) {
        const position = editor.getPosition();
        editor.executeEdits('', [{
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          ),
          text: ` [${getMessage('uploadFailed')}] `,
          forceMoveMarkers: true
        }]);
      }
    }
  };

  React.useEffect(() => {
    // 在组件挂载时注入样式
    const styleElement = document.createElement('style');
    styleElement.textContent = mentionStyles;
    document.head.appendChild(styleElement);

    // 添加事件监听，当收到编辑器获得焦点事件时，让编辑器获得焦点
    const unsubscribe = eventBus.subscribe(EVENTS.EDITOR.FOCUS, () => {
      if (editorRef.current) {
        editorRef.current.focus();
      }
    });

    // 添加拖拽上传图片支持
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (editorContainer.current) {
        editorContainer.current.classList.add('drag-over');
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (editorContainer.current) {
        editorContainer.current.classList.remove('drag-over');
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (editorContainer.current) {
        editorContainer.current.classList.remove('drag-over');
      }

      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
          await handleImageUpload(file);
        }
      }
    };

    // 添加粘贴图片支持
    const handlePaste = async (e: ClipboardEvent) => {
      // 只处理当编辑器获得焦点时的粘贴事件
      if (document.activeElement !== editorContainer.current &&
        !editorContainer.current?.contains(document.activeElement)) {
        return;
      }

      if (e.clipboardData && e.clipboardData.items) {
        const items = e.clipboardData.items;

        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            // 阻止默认粘贴行为
            e.preventDefault();

            // 获取图片文件
            const file = items[i].getAsFile();
            if (file) {
              await handleImageUpload(file);
              break;
            }
          }
        }
      }
    };

    // 为编辑器容器添加拖拽事件监听
    if (editorContainer.current) {
      editorContainer.current.addEventListener('dragover', handleDragOver);
      editorContainer.current.addEventListener('dragleave', handleDragLeave);
      editorContainer.current.addEventListener('drop', handleDrop);
    }

    // 添加粘贴事件监听器到document
    document.addEventListener('paste', handlePaste);

    return () => {
      // 在组件卸载时移除样式
      document.head.removeChild(styleElement);
      // 取消事件订阅
      unsubscribe();
      // 移除拖拽事件监听
      if (editorContainer.current) {
        editorContainer.current.removeEventListener('dragover', handleDragOver);
        editorContainer.current.removeEventListener('dragleave', handleDragLeave);
        editorContainer.current.removeEventListener('drop', handleDrop);
      }
      // 移除粘贴事件监听
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  // 添加文件组选择事件监听
  React.useEffect(() => {
    // 监听文件组选择事件 - 这些只有在isActive时才响应
    const handleFileGroupSelectFocus = (data: FileGroupSelectFocusEventData) => {
      if (!isActive || (data.panelId && data.panelId !== panelId)) {
        return;
      }
      eventBus.publish(EVENTS.FILE_GROUP_SELECT.FOCUS, new FileGroupSelectFocusEventData(panelId));
    };

    const unsubscribe = eventBus.subscribe(EVENTS.HOTKEY.FOCUS_FILE_GROUP, handleFileGroupSelectFocus);

    return () => {
      unsubscribe();
    };
  }, [isActive, panelId]);

  // 添加新建对话事件监听
  React.useEffect(() => {
    const handleNewChat = (data: any) => {
      if (!isActive || (data.panelId && data.panelId !== panelId)) {
        return;
      }
      eventBus.publish(EVENTS.CHAT.NEW_CHAT, new NewChatEventData(panelId));
    };

    const unsubscribe = eventBus.subscribe(EVENTS.HOTKEY.NEW_CHAT, handleNewChat);

    return () => {
      unsubscribe();
    };
  }, [isActive, panelId]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    // 存储editor引用
    editorRef.current = editor;

    // 添加键盘事件拦截器，处理全局热键
    const handleKeyDown = (e: any) => {
      const isMac = navigator.platform.indexOf('Mac') === 0;
      const metaOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      
      // 拦截并处理全局热键
      // ============= 优先拦截全局热键 =============
      if (metaOrCtrl) {
        switch (e.code) {
          case 'Enter': // Cmd/Ctrl + Enter: 发送消息
            e.preventDefault();
            e.stopPropagation();
            eventBus.publish(EVENTS.CHAT.SEND_MESSAGE, new SendMessageEventData("", panelId));
            return false;
          case 'Period': // Cmd/Ctrl + . : 切换模式
            e.preventDefault();
            e.stopPropagation();
            eventBus.publish(EVENTS.UI.TOGGLE_WRITE_MODE, new ToggleWriteModeEventData(panelId || 'main'));
            return false;
          case 'KeyI': // Cmd/Ctrl + I: 焦点到文件组选择器
            e.preventDefault();
            e.stopPropagation();
            eventBus.publish(EVENTS.HOTKEY.FOCUS_FILE_GROUP, new HotkeyEventData(panelId || 'main'));
            return false;
          case 'KeyL': // Cmd/Ctrl + L: 最大化/最小化
            e.preventDefault();
            e.stopPropagation();
            eventBus.publish(EVENTS.UI.TOGGLE_INPUT_FULLSCREEN, new ToggleInputFullscreenEventData(panelId || 'main'));
            return false;
          
          case 'Slash':
            e.preventDefault();
            e.stopPropagation();
            eventBus.publish(EVENTS.CHAT.NEW_CHAT, new NewChatEventData(panelId || 'main'));
            return false;
            
          // 可以添加更多全局热键处理...
        }
      }                  
      // 对于不需要拦截的按键，允许编辑器默认处理
      return true;
    };
    
    // 添加编辑器的键盘事件拦截
    editor.onKeyDown(handleKeyDown);

    // 添加上传图片按钮
    editor.addAction({
      id: 'upload-image',
      label: getMessage('uploadImage'),
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
      run: () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
          const file = e.target.files[0];
          if (file) {
            handleImageUpload(file);
          }
        };
        input.click();
      }
    });

    // 首先通知父组件编辑器已经挂载
    onEditorDidMount(editor, monaco);

    // 注意：不再直接注册快捷键，而是使用全局热键管理器

    // 添加粘贴事件监听器到编辑器实例
    editor.onDidPaste(() => {
      // 编辑器已经处理了粘贴，我们只需要检查是否有图片
      setTimeout(() => {
        // 延迟检查，确保系统粘贴事件已处理
        const clipboardItems = navigator.clipboard && navigator.clipboard.read ?
          navigator.clipboard.read().catch(() => null) : null;

        if (clipboardItems) {
          clipboardItems.then(items => {
            if (items) {  // 添加null检查
              for (const item of items) {
                // 检查是否有图片类型
                if (item.types && item.types.some(type => type.startsWith('image/'))) {
                  const imageType = item.types.find(type => type.startsWith('image/'));
                  if (imageType) {
                    item.getType(imageType).then(blob => {
                      const file = new File([blob], "pasted-image.png", { type: imageType });
                      handleImageUpload(file);
                    }).catch(e => console.error(getMessage('getImageFailed'), e));
                  }
                }
              }
            }
          }).catch(e => console.error(getMessage('clipboardReadFailed'), e));
        }
      }, 0);
    });

    // ----- mention 相关处理 -----

    // 注册自定义命令，用于处理自动完成选择事件
    monaco.editor.registerCommand('editor.acceptedCompletion', function (...args: any[]) {
      // Monaco可能不会按预期传递编辑器实例，所以我们使用当前引用
      const currentEditor = editorRef.current;
      if (!currentEditor) return null;

      // 解析参数 - 不依赖于editor参数
      const [, ...restArgs] = args;
      let name: string, path: string, mentionType: 'file' | 'symbol', item: EnhancedCompletionItem;

      if (restArgs.length >= 3) {
        name = restArgs[0];
        path = restArgs[1];
        mentionType = restArgs[2] as 'file' | 'symbol';
        item = restArgs[3] || {} as EnhancedCompletionItem;
        } else {
          console.warn(getMessage('insufficientArguments'));
          return null;
        }

      // 获取当前光标位置
      const position = currentEditor.getPosition();
      const model = currentEditor.getModel();

      // 获取当前行文本
      const lineContent = model.getLineContent(position.lineNumber);

      // 找到@符号的位置
      let atSignColumn = position.column - 1;
      while (atSignColumn > 0 && lineContent.charAt(atSignColumn - 1) !== '@') {
        atSignColumn--;
      }

      // 创建一个range从@到当前位置
      const range = new monaco.Range(
        position.lineNumber,
        atSignColumn,
        position.lineNumber,
        position.column
      );

      // 添加新的mention
      addMention(range, mentionType, name, path, item);

      return null;
    });

    // 监听鼠标点击事件，处理点击mention
    editor.onMouseDown((e: any) => {
      if (e.target.type === monaco.editor.MouseTargetType.CONTENT_TEXT) {
        const position = e.target.position;

        // 检查点击位置是否在任何mention范围内
        for (const mention of mentionsRef.current) {
          if (mention.range.containsPosition(position)) {
            // 触发mention点击回调
            if (onMentionClick) {
              onMentionClick(mention.type, mention.text, mention.item);
            }
            break;
          }
        }
      }
    });

    // 监听内容变化更新mention
    editor.onDidChangeModelContent(() => {
      handleContentChange();
    });

    // 修改为使用模块级变量检查是否已注册
    if (!isProviderRegistered) {
      monaco.languages.registerCompletionItemProvider('markdown', {
        triggerCharacters: ['@'],
        provideCompletionItems: async (model: any, position: any) => {
          // 获取当前行的内容
          const lineContent = model.getLineContent(position.lineNumber);
          // 获取光标前的文本
          const textBeforeCursor = lineContent.substring(0, position.column - 1);

          // 检查是否有@字符，并从@字符后开始提取查询文本
          const atSignIndex = textBeforeCursor.lastIndexOf('@');

          // 如果找到@字符，则从@后面开始提取；否则返回空字符串
          let query = '';
          if (atSignIndex !== -1) {
            query = textBeforeCursor.substring(atSignIndex + 1); // +1 跳过@字符本身
          }

          console.log(getMessage('extractedQuery'), query, getMessage('originalText'), textBeforeCursor);

          // 并行获取文件和符号补全
          const [fileResponse, symbolResponse] = await Promise.all([
            fetch(`/api/completions/files?name=${encodeURIComponent(query)}`),
            fetch(`/api/completions/symbols?name=${encodeURIComponent(query)}`)
          ]);

          const [fileData, symbolData] = await Promise.all([
            fileResponse.json(),
            symbolResponse.json()
          ]);

          // 处理文件补全结果
          const fileSuggestions = fileData.completions.map((item: CompletionItem) => {
            const enhancedItem: EnhancedCompletionItem = {
              ...item,
              mentionType: 'file'
            };

            return {
              label: item.name,
              kind: monaco.languages.CompletionItemKind.File,
              insertText: item.name,
              detail: getMessage('file'),
              documentation: `${getMessage('path')}: ${item.location || item.path}`,
              command: {
                id: 'editor.acceptedCompletion',
                title: getMessage('file'),
                arguments: [item.name, item.path, 'file', enhancedItem]
              },
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
            };
          });

          // 处理符号补全结果
          const symbolSuggestions = symbolData.completions.map((item: CompletionItem) => {
            const enhancedItem: EnhancedCompletionItem = {
              ...item,
              mentionType: 'symbol'
            };

            return {
              label: `${item.name}(${item.path})`,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: `${item.name}(${item.path})`,
              detail: getMessage('symbol'),
              documentation: `${getMessage('location')}: ${item.path}`,
              command: {
                id: 'editor.acceptedCompletion',
                title: getMessage('symbol'),
                arguments: [item.name, item.path, 'symbol', enhancedItem]
              },
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
            };
          });

          // 实现去重逻辑，避免重复项
          const uniqueSuggestions = new Map();
          [...fileSuggestions, ...symbolSuggestions].forEach(item => {
            const key = `${item.label}-${item.detail}`;
            if (!uniqueSuggestions.has(key)) {
              uniqueSuggestions.set(key, item);
            }
          });

          // 合并建议，使用去重后的结果
          return {
            suggestions: Array.from(uniqueSuggestions.values()),
            incomplete: true
          };
        }
      });

      // 设置为已注册
      isProviderRegistered = true;
      console.log(getMessage('completionProviderRegistered'));
    }
  };

  return (
    <div className="w-full relative h-full flex flex-col">
      <div
        ref={editorContainer}
        className={`editor-container w-full border border-gray-700 rounded-md overflow-hidden ${isMaximized ? 'h-full flex-grow' : 'h-[80px]'
          }`}
        style={{ width: '100%' }}
      >
        <Editor
          height="100%"
          defaultLanguage="markdown"
          defaultValue={defaultValue}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          // 禁用自动检测和加载远程资源
          loading={<div className="flex items-center justify-center h-full">{getMessage('loadingEditor')}</div>}
          // 确保使用本地资源
          beforeMount={(monaco) => {
            // 设置 Monaco 环境，使用本地 worker
            window.MonacoEnvironment = {
              getWorkerUrl: (workerId: string, label: string): string => {
                return `/monaco-editor/min/vs/base/worker/workerMain.js`;
              }
            };
          }}
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            lineNumbers: 'off',
            folding: false,
            contextmenu: false,
            fontFamily: 'monospace',
            fontSize: 14,
            lineHeight: 1.5,
            padding: { top: 8, bottom: 8 },
            suggestOnTriggerCharacters: true,
            quickSuggestions: false,
            acceptSuggestionOnEnter: 'smart',
            overviewRulerLanes: 0,
            overviewRulerBorder: false,
            fixedOverflowWidgets: true,
            // 禁用内置快捷键，将由全局热键管理器处理
            // 禁用所有命令绑定，改为由全局热键管理器处理
            quickSuggestionsDelay: 100,
            tabCompletion: 'off',
            // 重要：禁用部分快捷键，避免与全局热键冲突
            find: {
              addExtraSpaceOnTop: false,
            },
            links: false,
            // 使用Monaco默认支持的配置禁用键绑定
            readOnly: false, // 不是只读模式
            // 自定义操作处理在handleEditorDidMount中配置
            suggest: {
              insertMode: 'replace',
              snippetsPreventQuickSuggestions: true,
            }
          }}
        />
      </div>
    </div>
  );
};

export default EditorComponent;