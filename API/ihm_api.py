import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel

from furnace_dao import FurnaceDAO
from cliente import ClienteModBus

from fastapi.middleware.cors import CORSMiddleware

class FurnaceData(BaseModel):
    f1_temp_zone1: float
    f1_temp_zone2: float
    f1_fuel_state: int
    f1_vel_motor: float
    f1_setpoint: float
    f2_temp_zone1: float
    f2_temp_zone2: float
    f2_fuel_state: int
    f2_vel_motor: float
    f2_setpoint: float
    timestamp: str


# ============================================================
#   FASTAPI
# ============================================================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
#   CONFIGURAÇÃO DO CLIENTE MODBUS
# ============================================================
cliente = ClienteModBus(
    server_ip="localhost",
    porta=502,
    tags_address={
        "f1_temp_zone1": 1000,
        "f1_temp_zone2": 1002,
        "f1_fuel_state": 1004,
        "f1_vel_motor":1005,
        "f1_setpoint": 1007,
        "f2_temp_zone1": 1009,
        "f2_temp_zone2": 1011,
        "f2_fuel_state": 1013,
        "f2_vel_motor": 1014,
        "f2_setpoint": 1016,
    },
    read_time=5,
    db_path="furnaces_database.db"
)


FurnaceDB = FurnaceDAO("furnaces_database.db")


# ============================================================
#   ROTA INICIAL
# ============================================================
@app.get("/")
def init():
    return "Web Service - Sistema de Supervisão dos Fornos de Reaquecimento"


# ============================================================
#   ROTA PRINCIPAL — RETORNO DO ÚLTIMO DADO DA TABELA
#   (modelo do Robson, porém usando seu DAO e suas tags)
# ============================================================
@app.get("/furnace_data")
def get_last_data():

    # Lê do Modbus e insere uma linha no banco
    cliente.read_once()

    # Busca o último registro (DAO seu, não do Robson)
    row = FurnaceDB.get_last_furnace_data()

    if row is None:
        return {
            "f1_temp_zone1": None,
            "f1_temp_zone2": None,
            "f1_fuel_state": None,
            "f1_vel_motor": None,
            "f1_setpoint": None,
            "f2_temp_zone1": None,
            "f2_temp_zone2": None,
            "f2_fuel_state": None,
            "f2_vel_motor": None,
            "f2_setpoint": None,
            "timestamp": None
        }

    return row

if __name__ == "__main__":
    uvicorn.run("ihm_api:app", port=8000, log_level="info", reload=True)
