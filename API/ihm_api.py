import uvicorn

from fastapi import FastAPI
from pydantic import BaseModel
from house_dao import HouseDAO
from cliente import ClienteModBus

class House_Data(BaseModel):
    temperature: float
    humidity: float
    luminosity: int
    movement: bool
    timestamp: str

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Inicializa o cliente Modbus com as configurações necessárias
cliente = ClienteModBus(
    server_ip="localhost",
    porta=502,
    tags_adress={
        'temperature': 1000,
        'movement': 1001,
        'humidity': 1002,
        'luminosity': 1003
    },
    read_time=5,
    db_path='house_database.db'  
)

Casa_Automatizada = HouseDAO('house_database.db')

@app.get("/")
def init():
    return 'Web Service da Automação Residencial'

@app.get("/house_data")
def get_last_data():

    cliente.ler_modbus_uma_vez()
    row = Casa_Automatizada.get_last_house_data()

    if row is None:
        return {
            "temperature": None,
            "humidity": None,
            "luminosity": None,
            "movement": None,
            "timestamp": None
        }

    return row


if __name__ == '__main__':

    uvicorn.run('ihm_api:app', port=8000, log_level='info', reload=True)