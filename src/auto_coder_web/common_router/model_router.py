from fastapi import APIRouter, HTTPException
from typing import List, Dict, Optional
from pydantic import BaseModel
from autocoder import models as model_utils

router = APIRouter()

class Model(BaseModel):
    name: str
    description: str
    model_name: str
    model_type: str
    base_url: str
    api_key_path: str
    is_reasoning: bool
    input_price: float
    output_price: float
    average_speed: float

@router.get("/models", response_model=List[Model])
async def get_models():
    """
    Get all available models
    """
    try:
        models_list = model_utils.load_models()
        return models_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models/{model_name}", response_model=Model)
async def get_model(model_name: str):
    """
    Get a specific model by name
    """
    try:
        model = model_utils.get_model_by_name(model_name)
        return model
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/models", response_model=Model)
async def add_model(model: Model):
    """
    Add a new model
    """
    try:
        existing_models = models.load_models()
        if any(m["name"] == model.name for m in existing_models):
            raise HTTPException(status_code=400, detail="Model with this name already exists")
        
        existing_models.append(model.model_dump())
        model_utils.save_models(existing_models)
        return model
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/models/{model_name}", response_model=Model)
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

@router.delete("/models/{model_name}")
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

@router.put("/models/{model_name}/api_key")
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

@router.put("/models/{model_name}/input_price")
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

@router.put("/models/{model_name}/output_price")
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

@router.put("/models/{model_name}/speed")
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
