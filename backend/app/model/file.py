from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class File(Base):
    __tablename__ = "files"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    path_on_disk = Column(String)
    file_size = Column(Integer)
    parent_folder_id = Column(Integer)
    owner_id = Column(Integer)
    created_at = Column(DateTime)