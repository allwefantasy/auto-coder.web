from fastapi import APIRouter, HTTPException
from typing import List, Dict, Optional
import json
import os
from pydantic import BaseModel
from autocoder import models as model_utils

router = APIRouter()

# Path for providers JSON file
PROVIDERS_FILE = os.path.expanduser("~/.auto-coder/auto-coder.web/models_provider.json")

# Ensure directory exists
os.makedirs(os.path.dirname(PROVIDERS_FILE), exist_ok=True)

class Model(BaseModel):
    name: str
    description: str = ""
    model_name: str
    model_type: str
    base_url: str
    api_key_path: str
    is_reasoning: bool = False
    input_price: float = 0.0
    output_price: float = 0.0
    average_speed: float = 0.0

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
        
        existing_models.append(model.model_dump())
        model_utils.save_models(existing_models)
        return model
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/api/models/{model_name}", response_model=Model)
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

@router.delete("/api/models/{model_name}")
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

class ProviderConfig(BaseModel):
    name: str
    base_url: str
    models: List[ModelInfo]

def load_providers() -> List[Dict]:
    """Load providers from JSON file"""
    if not os.path.exists(PROVIDERS_FILE):
        return []
    try:
        with open(PROVIDERS_FILE, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading providers: {e}")
        return []

def save_providers(providers: List[Dict]) -> None:
    """Save providers to JSON file"""
    with open(PROVIDERS_FILE, 'w') as f:
        json.dump(providers, f, indent=2)

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