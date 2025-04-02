import React from 'react';
import { Editor, loader } from '@monaco-editor/react';
import { uploadImage } from '../../services/api';
import { CompletionItem, EnhancedCompletionItem } from './types';
import eventBus, { EVENTS } from '../../services/eventBus';
// 导入 monaco 编辑器类型
import * as monaco from 'monaco-editor';

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
  onShouldSendMessage: () => void;
  /** 编辑器的初始值 */
  defaultValue?: string;
  /** 编辑器值改变时的回调 */
  onChange?: (value: string | undefined) => void;
  /** 切换编辑器最大化/最小化状态 */
  onToggleMaximize: () => void;
  /** 当点击 mention 项时的回调 */
  onMentionClick?: (type: 'file' | 'symbol', text: string, item?: EnhancedCompletionItem) => void;
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
  onShouldSendMessage,
  defaultValue = '',
  onChange,
  onToggleMaximize,
  onMentionClick,
}) => {
  // 添加一个ref来跟踪提供者是否已经注册
  const providerRegistered = React.useRef(false);
  // 添加一个ref来存储editor的引用
  const editorRef = React.useRef<any>(null);
  // 添加一个ref来存储编辑器容器的引用
  const editorContainer = React.useRef<HTMLDivElement>(null);
  // 存储所有mention项的引用
  const mentionsRef = React.useRef<MentionData[]>([]);
  // 存储当前装饰IDs的引用
  const decorationsRef = React.useRef<string[]>([]);

  // 更新mention装饰
  const updateMentionDecorations = React.useCallback(() => {
    if (!editorRef.current) return;

    const decorations = mentionsRef.current.map(mention => ({
      range: mention.range,
      options: {
        inlineClassName: 'monaco-mention',
        hoverMessage: { value: `**${mention.type === 'file' ? '文件' : '符号'}**: ${mention.path}` },
        stickiness: monaco.editor.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges
      }
    }));

    decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, decorations);

    // 更新每个mention的decorationId
    mentionsRef.current.forEach((mention, index) => {
      mention.decorationId = decorationsRef.current[index];
    });

    // 通过 eventBus 发布 mentions 变化事件
    eventBus.publish(EVENTS.EDITOR.MENTIONS_CHANGED, mentionsRef.current.map(m => ({
      type: m.type,
      text: m.text,
      path: m.path,
      item: m.item
    })));
  }, []);

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
          text: '![上传中...]()  ',
          forceMoveMarkers: true
        }]);
        
        // 上传图片
        const response = await uploadImage(file);
        
        if (response.success) {
          // 获取当前光标位置
          const currentPosition = editor.getPosition();
          
          // 查找上传中文本的位置
          const model = editor.getModel();
          const content = model.getValue();
          const loadingTextPos = content.indexOf('![上传中...]()');
          
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
            editor.executeEdits('', [{
              range: new monaco.Range(
                line,
                col,
                line,
                col + '![上传中...]()'.length
              ),
              text: `<_img_>${response.path}</_img_>`,
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
              text: `<_img_>${response.path}</_img_>`,
              forceMoveMarkers: true
            }]);
          }
        } else {
          console.error('Image upload failed:', response);
        }
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      
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
          text: ' [图片上传失败] ',
          forceMoveMarkers: true
        }]);
      }
    }
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    // 存储editor引用
    editorRef.current = editor;

    // 添加上传图片按钮
    editor.addAction({
      id: 'upload-image',
      label: 'Upload Image',
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

    // 添加键盘快捷键 - 修改为触发InputArea全屏
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL, () => {
      // 触发InputArea全屏事件
      eventBus.publish(EVENTS.UI.TOGGLE_INPUT_FULLSCREEN);
      return null;
    });

    // 添加提交快捷键
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onShouldSendMessage();
    });

    // 添加聚焦文件组选择快捷键
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => {
      // 触发自定义事件
      eventBus.publish(EVENTS.FILE_GROUP_SELECT.FOCUS);
      return null;
    });

    // 添加新建对话快捷键
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
      // 触发新建对话事件
      eventBus.publish(EVENTS.CHAT.NEW_CHAT);
      return null;
    });
    
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
                    }).catch(e => console.error("获取图片失败:", e));
                  }
                }
              }
            }
          }).catch(e => console.error("读取剪贴板失败:", e));
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
        console.warn('Insufficient arguments for mention completion');
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

    // 注册自动完成提供者
    if (!providerRegistered.current) {
      monaco.languages.registerCompletionItemProvider('markdown', {
        triggerCharacters: ['@'], // 保持触发字符为@
        provideCompletionItems: async (model: any, position: any, context: any) => {
          // 仅处理由@触发或未完成补全的重新触发
          if (
            context.triggerCharacter !== '@' &&
            context.triggerKind !== monaco.languages.CompletionTriggerKind.TriggerForIncompleteCompletions
          ) {
            return { suggestions: [], incomplete: false };
          }

          // 获取当前行文本及光标前内容
          const lineContent = model.getLineContent(position.lineNumber);
          const textBeforeCursor = lineContent.substring(0, position.column - 1);

          // 查找最近的@符号位置
          const atSignIndex = textBeforeCursor.lastIndexOf('@');
          if (atSignIndex === -1) return { suggestions: [], incomplete: false };

          // 提取@符号后的内容
          const afterAtContent = textBeforeCursor.substring(atSignIndex + 1);

          // 检查@后是否有空格（无效场景）
          if (/\s/.test(afterAtContent)) {
            return { suggestions: [], incomplete: false };
          }

          // 提取查询内容（@符号后的部分）
          const query = afterAtContent;

          console.log('提取的查询:', query, '原始文本:', textBeforeCursor, '触发类型:', context.triggerKind);

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
              detail: "文件",
              documentation: `路径: ${item.location || item.path}`,
              command: {
                id: 'editor.acceptedCompletion',
                title: '选择完成',
                arguments: [item.name, item.path, 'file', enhancedItem]
              },
              // 定义替换范围，从@符号后开始到当前光标位置
              range: new monaco.Range(
                position.lineNumber,
                atSignIndex + 2, // +2 跳过@符号
                position.lineNumber,
                position.column
              ),
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
              detail: "符号",
              documentation: `位置: ${item.path}`,
              command: {
                id: 'editor.acceptedCompletion',
                title: '选择完成',
                arguments: [item.name, item.path, 'symbol', enhancedItem]
              },
              // 定义替换范围，从@符号后开始到当前光标位置
              range: new monaco.Range(
                position.lineNumber,
                atSignIndex + 2, // +2 跳过@符号
                position.lineNumber,
                position.column
              ),
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
            };
          });

          // 合并建议并标记为未完成
          return {
            suggestions: [...fileSuggestions, ...symbolSuggestions],
            incomplete: true // 关键：允许继续输入触发
          };
        }
      });

      providerRegistered.current = true;
    }
  };

  return (
    <div className="w-full relative h-full flex flex-col">
      <div
        ref={editorContainer}
        className={`editor-container w-full border border-gray-700 rounded-md overflow-hidden ${isMaximized ? 'h-full flex-grow' : 'h-[200px]'
          }`}
        style={{ width: '100%' }}
      >
        <Editor
          height="100%"
          defaultLanguage="markdown"
          defaultValue={defaultValue}
          onChange={onChange}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          // 禁用自动检测和加载远程资源
          loading={<div className="flex items-center justify-center h-full">加载编辑器中...</div>}
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