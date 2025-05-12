# Mode Switching Mechanism in Auto-Coder.web

This document explains the mode switching mechanism implemented in the InputArea and ChatPanel components, including how it affects other UI elements and functionality.

## Overview

The Auto-Coder.web application supports three distinct input modes:
1. **Chat Mode** - Default conversation mode
2. **Write Mode** - For writing longer content or code
3. **Rule Mode** - For specifying rules or constraints

These modes are controlled by two state variables:
- `isWriteMode`: Boolean flag indicating if Write Mode is active
- `isRuleMode`: Boolean flag indicating if Rule Mode is active

The mode state is determined by the combination of these two variables:
- Chat Mode: `isWriteMode = false` and `isRuleMode = false`
- Write Mode: `isWriteMode = true` and `isRuleMode = false`
- Rule Mode: `isWriteMode = false` and `isRuleMode = true`

## Mode Switching Implementation

### In InputArea Component

The mode switching logic is primarily implemented in the `InputArea` component through the `toggleWriteMode` function:

```javascript
const toggleWriteMode = useCallback(() => {
  // 按照Chat -> Write -> Rule -> Chat的顺序循环切换
  if (!isWriteMode && !isRuleMode) {
    // 当前是Chat模式，切换到Write模式
    setIsWriteMode(true);
    setIsRuleMode(false);
  } else if (isWriteMode && !isRuleMode) {
    // 当前是Write模式，切换到Rule模式
    setIsWriteMode(false);
    setIsRuleMode(true);
  } else {
    // 当前是Rule模式，切换到Chat模式
    setIsWriteMode(false);
    setIsRuleMode(false);
  }
}, [isWriteMode, isRuleMode, setIsWriteMode, setIsRuleMode]);
```

This function cycles through the three modes in a specific order: Chat → Write → Rule → Chat.

### Mode Switching Triggers

The mode can be switched in several ways:

1. **UI Selection**: Through a dropdown select in the InputArea component:
   ```javascript
   <Select
     size="small"
     value={isRuleMode ? "rule" : (isWriteMode ? "write" : "chat")}
     onChange={(value) => {
       if (value === "rule") {
         setIsRuleMode(true);
         setIsWriteMode(false);
       } else {
         setIsRuleMode(false);
         setIsWriteMode(value === "write");
       }
     }}
     options={[
       { value: 'chat', label: 'Chat' },
       { value: 'write', label: 'Write' },
       { value: 'rule', label: 'Rule' },
     ]}
   />
   ```

2. **Keyboard Shortcut**: Using the hotkey `Cmd + .` (Mac) or `Ctrl + .` (Windows/Linux):
   ```javascript
   const handleToggleModeHotkey = useCallback((data: HotkeyEventData) => {
     // 检查事件是否与当前面板相关
     if (data.panelId && data.panelId !== panelId) {
       return;
     }
     toggleWriteMode();
   }, [toggleWriteMode, panelId]);
   ```

3. **Event-based**: Through the event bus system:
   ```javascript
   const handleToggleWriteMode = (data: ToggleWriteModeEventData) => {
     // 检查事件是否与当前面板相关      
     if (data.panelId && data.panelId !== panelId) {
       return; // 如果事件不属于当前面板，直接返回
     }      
     toggleWriteMode();
   };

   const unsubscribe = eventBus.subscribe(EVENTS.UI.TOGGLE_WRITE_MODE, handleToggleWriteMode);
   ```

## Mode State Management

The mode state variables (`isWriteMode` and `isRuleMode`) are defined in the `ChatPanel` component and passed down to the `InputArea` component as props:

```javascript
// In ChatPanel.tsx
const [isWriteMode, setIsWriteMode] = useState<boolean>(false);
const [isRuleMode, setIsRuleMode] = useState<boolean>(false);

// Passed to InputArea
<InputArea
  // ...other props
  isWriteMode={isWriteMode}
  setIsWriteMode={setIsWriteMode}
  isRuleMode={isRuleMode}
  setIsRuleMode={setIsRuleMode}
  // ...other props
/>
```

This design allows the ChatPanel to maintain the mode state while letting the InputArea handle the mode switching logic and UI representation.

## Effects on Other UI Elements

The mode switching affects several UI elements and behaviors:

### 1. Provider Selectors

The `ProviderSelectors` component receives the `isWriteMode` state:

```javascript
<ProviderSelectors isWriteMode={isWriteMode} />
```

This likely changes the available options or behavior of provider selectors based on the current mode.

### 2. Editor Component

The `EditorComponent` doesn't directly receive the mode state, but it's affected indirectly through:

- Different keyboard shortcut behaviors
- Different event handling based on the current mode
- Potentially different editor configurations or behaviors

### 3. Message Handling

The message handling logic in `ChatPanel` may process messages differently based on the current mode:

- In Chat Mode: Messages are processed as regular conversation
- In Write Mode: Messages might be treated as longer-form content
- In Rule Mode: Messages might be interpreted as rules or constraints for the AI

### 4. Visual Indicators

The UI provides visual indicators of the current mode:
- A dropdown selector showing the current mode
- Keyboard shortcut hints
- Potentially different styling or behavior of the editor based on the mode

## Agentic Mode

In addition to the three input modes, there's also an "Agentic Mode" (or "Step By Step" mode) controlled by the `enableAgenticMode`/`agenticActive` state:

```javascript
const [enableAgenticMode, setEnableAgenticMode] = React.useState<boolean>(true);
// In InputArea
const [agenticActive, setAgenticActive] = useState(true);
```

This mode is toggled separately and affects how the AI processes the input:

```javascript
<button
  className={`p-0.5 rounded-md transition-all duration-200
    ${agenticActive ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-400 hover:text-gray-300'}`}
  onClick={() => {
    const newActive = !agenticActive;
    setAgenticActive(newActive);
    import('../../services/eventBus').then(({ default: eventBus }) => {
      eventBus.publish(EVENTS.AGENTIC.MODE_CHANGED, new AgenticModeChangedEventData(newActive, panelId));
    });
  }}
  title="Step By Step"
>
  <span className={`text-xs ${agenticActive ? '' : 'opacity-50'}`}>{getMessage('agentButtonLabel')}</span>
</button>
```

When Agentic Mode is enabled, the AI likely processes tasks step-by-step, providing more detailed explanations.

## Summary

The mode switching mechanism in Auto-Coder.web provides a flexible way for users to interact with the AI assistant in different contexts:

1. **Chat Mode**: Quick back-and-forth conversation
2. **Write Mode**: Longer-form content or code writing
3. **Rule Mode**: Specifying rules or constraints for the AI

The implementation uses a combination of state variables, event handling, and UI components to create a seamless user experience when switching between these modes.
