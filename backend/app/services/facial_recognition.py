import os
import numpy as np
import face_recognition
import cv2
from typing import List, Tuple, Optional
from app.core.config import settings


class FacialRecognitionService:
    def __init__(self):
        self.known_encodings = {}
        self.known_names = {}
        self.tolerance = settings.RECOGNITION_TOLERANCE
    
    def encode_face(self, image_path: str) -> Optional[np.ndarray]:
        """Encode a face from an image file."""
        try:
            image = face_recognition.load_image_file(image_path)
            encodings = face_recognition.face_encodings(image)
            
            if len(encodings) > 0:
                return encodings[0]  # Return the first face encoding
            return None
        except Exception as e:
            print(f"Error encoding face: {e}")
            return None
    
    def recognize_faces(self, frame: np.ndarray) -> List[Tuple[str, Tuple[int, int, int, int], float]]:
        """
        Recognize faces in a frame.
        
        Returns:
            List of tuples (name, (top, right, bottom, left), confidence)
        """
        if not self.known_encodings:
            return []
        
        # Convert BGR to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Find face locations
        face_locations = face_recognition.face_locations(rgb_frame, model="hog")
        
        if not face_locations:
            return []
        
        # Encode faces in the frame
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
        
        recognized_faces = []
        for (face_encoding, face_location) in zip(face_encodings, face_locations):
            # Compare with known faces
            matches = face_recognition.compare_faces(
                list(self.known_encodings.values()),
                face_encoding,
                tolerance=self.tolerance
            )
            
            name = "Unknown"
            confidence = 0.0
            
            # Find the best match
            face_distances = face_recognition.face_distance(
                list(self.known_encodings.values()),
                face_encoding
            )
            best_match_index = np.argmin(face_distances)
            
            if matches[best_match_index]:
                name = list(self.known_encodings.keys())[best_match_index]
                confidence = 1 - face_distances[best_match_index]  # Convert distance to confidence
            
            recognized_faces.append((name, face_location, confidence))
        
        return recognized_faces
    
    def add_known_face(self, name: str, encoding: np.ndarray):
        """Add a known face encoding."""
        self.known_encodings[name] = encoding
        self.known_names[name] = name
    
    def remove_known_face(self, name: str):
        """Remove a known face."""
        if name in self.known_encodings:
            del self.known_encodings[name]
        if name in self.known_names:
            del self.known_names[name]
    
    def load_known_faces_from_db(self, encodings_dict: dict):
        """Load known faces from database."""
        self.known_encodings = {}
        for name, encoding_bytes in encodings_dict.items():
            if encoding_bytes is not None:
                encoding = np.frombuffer(encoding_bytes, dtype=np.float64)
                self.known_encodings[name] = encoding
    
    def get_frame_from_cctv(self, cctv_url: str) -> Optional[np.ndarray]:
        """Get a frame from CCTV feed."""
        try:
            cap = cv2.VideoCapture(cctv_url)
            if not cap.isOpened():
                return None
            
            ret, frame = cap.read()
            cap.release()
            
            if ret:
                return frame
            return None
        except Exception as e:
            print(f"Error reading from CCTV: {e}")
            return None


# Global instance
facial_recognition_service = FacialRecognitionService()

