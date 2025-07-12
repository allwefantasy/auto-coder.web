// 验证选中的模型中是不是都有key
export const validModelHasApiKey = (models: any[], key: string[] | string) => {
  let result: any[] = [];
  
  if (!key || (Array.isArray(key) && key.length === 0)) return true

  if (typeof key === "string") {
    result = models.filter((item) => item.api_key && key === item.name);
    return result.length === 1;
  }
  result = models.filter(
    (item) => item.api_key && key.includes(item.name)
  );
  return result.length === key.length;
};
