/**
 * SoundEffects.ts
 * 提供播放声音效果的工具函数
 */

// 预加载音频文件
const loadAudio = (url: string): HTMLAudioElement => {
  const audio = new Audio(url);
  audio.load(); // 预加载音频
  return audio;
};

// 轻柔的提示音效果 - 使用相对路径
const gentleNotificationSound = loadAudio('/sounds/gentle-notification.wav');
const softChimeSound = loadAudio('/sounds/soft-chime.wav');

/**
 * 播放轻柔的提示音
 * @param volume 音量大小，范围0-1，默认0.3
 */
export const playGentleNotification = (volume: number = 0.3): void => {
  try {
    // 克隆音频对象，避免多次播放冲突
    const sound = gentleNotificationSound.cloneNode() as HTMLAudioElement;
    sound.volume = Math.max(0, Math.min(1, volume)); // 确保音量在0-1范围内
    
    // 播放音频
    sound.play().catch(error => {
      console.warn('Failed to play sound effect:', error);
      // 大多数浏览器要求用户交互后才能播放音频
      // 这里静默失败，不影响用户体验
    });
  } catch (error) {
    console.error('Error playing sound effect:', error);
  }
};

/**
 * 播放柔和的铃声
 * @param volume 音量大小，范围0-1，默认0.3
 */
export const playSoftChime = (volume: number = 0.3): void => {
  try {
    const sound = softChimeSound.cloneNode() as HTMLAudioElement;
    sound.volume = Math.max(0, Math.min(1, volume));
    
    sound.play().catch(error => {
      console.warn('Failed to play sound effect:', error);
    });
  } catch (error) {
    console.error('Error playing sound effect:', error);
  }
};

/**
 * 播放成功完成任务的声音
 */
export const playTaskComplete = (): void => {
  playSoftChime(0.3);
};

/**
 * 播放错误提示音
 */
export const playErrorSound = (volume: number = 0.3): void => {
  // 错误提示音使用轻柔的提示音
  playGentleNotification(volume);
};

export default {
  playGentleNotification,
  playSoftChime,
  playTaskComplete,
  playErrorSound
};
