from fastapi import APIRouter, HTTPException, Request
from typing import List, Dict, Optional
import json
import os
from pydantic import BaseModel
from autocoder import models as model_utils

router = APIRouter()

async def get_project_path(request: Request):
    """获取项目路径作为依赖"""
    return request.app.state.project_path

# Path for providers JSON file
PROVIDERS_FILE = os.path.expanduser("~/.auto-coder/keys/models_providers.json")

# Ensure directory exists
os.makedirs(os.path.dirname(PROVIDERS_FILE), exist_ok=True)

class Model(BaseModel):
    name: str
    description: str = ""
    model_name: str
    model_type: str = "saas/openai"
    base_url: str
    api_key: str = ""
    api_key_path:str = ""
    is_reasoning: bool = False
    input_price: float = 0.0
    output_price: float = 0.0
    average_speed: float = 0.0
    max_output_tokens: int = 8096

@router.get("/api/models", response_model=List[Model])
async def get_models():
    """
    Get all available models
    """
    try:
        models_list = model_utils.load_models()
        return models_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/models/{model_name}", response_model=Model)
async def get_model(model_name: str):
    """
    Get a specific model by name
    """
    try:
        model = model_utils.get_model_by_name(model_name)
        return model
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/api/models", response_model=Model)
async def add_model(model: Model):
    """
    Add a new model
    """
    try:
        existing_models = model_utils.load_models()
        if any(m["name"] == model.name for m in existing_models):
            raise HTTPException(status_code=400, detail="Model with this name already exists")
                
        model_utils.add_and_activate_models([model.model_dump()])
        return model
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/api/models", response_model=Model)
async def update_model(model_name: str, model: Model):
    """
    Update an existing model
    """
    try:
        existing_models = model_utils.load_models()
        updated = False
        
        for m in existing_models:
            if m["name"] == model_name:
                m.update(model.model_dump())
                updated = True
                break
        
        if not updated:
            raise HTTPException(status_code=404, detail="Model not found")
            
        model_utils.save_models(existing_models)
        return model
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/models")
async def delete_model(model_name: str):
    """
    Delete a model by name
    """
    try:
        existing_models = model_utils.load_models()
        models_list = [m for m in existing_models if m["name"] != model_name]
        
        if len(existing_models) == len(models_list):
            raise HTTPException(status_code=404, detail="Model not found")
            
        model_utils.save_models(models_list)
        return {"message": f"Model {model_name} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/api/models/{model_name}/api_key")
async def update_model_api_key(model_name: str, api_key: str):
    """
    Update the API key for a specific model
    """
    try:
        result = model_utils.update_model_with_api_key(model_name, api_key)
        if result:
            return {"message": f"API key for model {model_name} updated successfully"}
        else:
            raise HTTPException(status_code=404, detail="Model not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/api/models/{model_name}/input_price")
async def update_model_input_price(model_name: str, price: float):
    """
    Update the input price for a specific model
    """
    try:
        result = model_utils.update_model_input_price(model_name, price)
        if result:
            return {"message": f"Input price for model {model_name} updated successfully"}
        else:
            raise HTTPException(status_code=404, detail="Model not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/api/models/{model_name}/output_price")
async def update_model_output_price(model_name: str, price: float):
    """
    Update the output price for a specific model
    """
    try:
        result = model_utils.update_model_output_price(model_name, price)
        if result:
            return {"message": f"Output price for model {model_name} updated successfully"}
        else:
            raise HTTPException(status_code=404, detail="Model not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/api/models/{model_name}/speed")
async def update_model_speed(model_name: str, speed: float):
    """
    Update the average speed for a specific model
    """
    try:
        result = model_utils.update_model_speed(model_name, speed)
        if result:
            return {"message": f"Speed for model {model_name} updated successfully"}
        else:
            raise HTTPException(status_code=404, detail="Model not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Provider management endpoints
class ModelInfo(BaseModel):
    id: str
    name: str
    input_price: float
    output_price: float
    is_reasoning: bool
    max_output_tokens: int = 8096
class ProviderConfig(BaseModel):
    name: str
    base_url: str
    model_type: str = "saas/openai"
    models: List[ModelInfo]

def load_providers() -> List[Dict]:
    """Load providers from JSON file"""
    # Default providers if file doesn't exist
    default_providers = [
        {
            "name": "siliconflow",
            "base_url": "https://api.siliconflow.cn/v1",
            "model_type": "saas/openai",
            "models": [
                {
                    "id": "Pro/deepseek-ai/DeepSeek-R1",
                    "name": "Deepseek R1-0528",
                    "input_price": 4.0,
                    "output_price": 16.0,
                    "is_reasoning": True
                },              
                {
                    "id": "Pro/deepseek-ai/DeepSeek-V3",
                    "name": "Deepseek V3-0324",
                    "input_price": 2.0,
                    "output_price": 8.0,
                    "is_reasoning": False
                }
            ]
        },
        {
            "name": "volcanoEngine",
            "base_url": "https://ark.cn-beijing.volces.com/api/v3",
            "model_type": "saas/openai",
            "models": [                
                {
                    "id": "deepseek-r1-250528",
                    "name": "Deepseek r1-250528",
                    "input_price": 4.0,
                    "output_price": 16.0,
                    "is_reasoning": True
                },                
                {
                    "id": "deepseek-v3-250324",
                    "name": "Deepseek v3-250324",
                    "input_price": 2.0,
                    "output_price": 8.0,
                    "is_reasoning": False
                }
            ]
        },
        {
            "name": "openrouter",
            "base_url": "https://openrouter.ai/api/v1",
            "model_type": "saas/openai",
            "models": [
                {
                    "id": "anthropic/claude-3.7-sonnet:thinking",
                    "name": "Claude 3.7 Sonnet Thinking",
                    "input_price": 22.0,
                    "output_price": 111.0,
                    "is_reasoning": True
                },
                {
                    "id": "anthropic/claude-3.7-sonnet",
                    "name": "Claude 3.7 Sonnet",
                    "input_price": 22.0,
                    "output_price": 111.0,
                    "is_reasoning": False
                },
                {
                    "id": "openai/gpt-4.1",
                    "name": "gpt-4.1",
                    "input_price": 14,
                    "output_price": 42,
                    "is_reasoning": False,
                    "max_output_tokens": 8096*3
                },
                {
                    "id": "openai/gpt-4.1-mini",
                    "name": "gpt-4.1-mini",
                    "input_price": 2.8,
                    "output_price": 11.2,
                    "is_reasoning": False,
                    "max_output_tokens": 8096*3
                },
                {
                    "id": "openai/gpt-4.1-nano",
                    "name": "gpt-4.1-nano",
                    "input_price": 0.7,
                    "output_price": 2.8,
                    "is_reasoning": False,
                    "max_output_tokens": 8096*3
                },
                {
                    "id": "google/gemini-2.5-pro-preview-03-25",
                    "name": "gemini-2.5-pro-preview-03-25",
                    "input_price": 0.0,
                    "output_price": 0.0,
                    "is_reasoning": False,
                    "max_output_tokens": 8096*2
                },
                {
                    "id": "anthropic/claude-sonnet-4",
                    "name": "claude-sonnet-4",
                    "input_price": 22.0,
                    "output_price": 111.0,
                    "is_reasoning": False,
                    "max_output_tokens": 8096*4
                },
                {
                    "id": "anthropic/claude-opus-4",
                    "name": "claude-opus-4",
                    "input_price": 111.0,
                    "output_price": 555.0,
                    "is_reasoning": False,
                    "max_output_tokens": 8096*4
                },
                {
                    "id": "deepseek/deepseek-r1-0528",
                    "name": "deepseek-r1-0528",
                    "input_price": 4.0,
                    "output_price": 16.0,
                    "is_reasoning": True,
                    "max_output_tokens": 8096*2
                }
            ]
        },        
        {
            "name": "google",
            "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
            "model_type": "saas/openai",
            "models": [
                {
                    "id": "gemini-2.5-pro-preview-05-06",
                    "name": "gemini-2.5-pro-preview-05-06",
                    "input_price": 8.8,
                    "output_price": 77.0,
                    "is_reasoning": False,
                    "max_output_tokens": 8096*4
                }
            ]
        }
    ]
    
    if not os.path.exists(PROVIDERS_FILE):
        return default_providers
    try:
        with open(PROVIDERS_FILE, 'r',encoding='utf-8') as f:
            # 根据名字去重，优先保留默认的提供上
            loaded_providers = json.load(f)
            providers_map = {provider["name"]: provider for provider in loaded_providers}
                        
            for default_provider in default_providers:
                if default_provider["name"] not in providers_map:                
                    providers_map[default_provider["name"]] = default_provider
                else:
                    # 根据 model id 去重合并 models 字段
                    existing_models = providers_map[default_provider["name"]]["models"]
                    existing_model_ids = {model["id"]: model for model in existing_models}
                    
                    # 添加默认提供商中不存在的模型
                    for model in default_provider["models"]:
                        existing_model_ids[model["id"]] = model
                    
                    # 更新模型列表
                    providers_map[default_provider["name"]]["models"] = list(existing_model_ids.values())
            return list(providers_map.values())
    except Exception as e:
        print(f"Error loading providers: {e}")
        return default_providers

def save_providers(providers: List[Dict]) -> None:
    """Save providers to JSON file"""
    with open(PROVIDERS_FILE, 'w',encoding='utf-8') as f:
        # 根据名字去重，然后再统一保存        
        json.dump(providers, f, indent=2,ensure_ascii=False)

@router.get("/api/providers", response_model=List[ProviderConfig])
async def get_providers():
    """Get all available providers"""
    try:
        providers = load_providers()
        return providers
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/providers", response_model=ProviderConfig)
async def add_provider(provider: ProviderConfig):
    """Add a new provider"""
    try:
        providers = load_providers()
        
        # Check if provider with same name already exists
        if any(p["name"] == provider.name for p in providers):
            raise HTTPException(status_code=400, detail="Provider with this name already exists")
        
        providers.append(provider.model_dump())
        save_providers(providers)
        return provider
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/api/providers/{provider_name}", response_model=ProviderConfig)
async def update_provider(provider_name: str, provider: ProviderConfig):
    """Update an existing provider"""
    try:
        providers = load_providers()
        updated = False
        
        for p in providers:
            if p["name"] == provider_name:
                p.update(provider.model_dump())
                updated = True
                break
        
        if not updated:
            raise HTTPException(status_code=404, detail="Provider not found")
            
        save_providers(providers)
        return provider
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/providers/{provider_name}")
async def delete_provider(provider_name: str):
    """Delete a provider by name"""
    try:
        providers = load_providers()
        providers_list = [p for p in providers if p["name"] != provider_name]
        
        if len(providers) == len(providers_list):
            raise HTTPException(status_code=404, detail="Provider not found")
            
        save_providers(providers_list)
        return {"message": f"Provider {provider_name} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))