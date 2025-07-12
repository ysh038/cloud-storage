from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Folder(Base):
    __tablename__ = "folders"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    parent_folder_id = Column(Integer)
    owner_id = Column(Integer)
    created_at = Column(DateTime)   