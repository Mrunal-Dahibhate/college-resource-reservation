import { useState } from "react";

function ResourceList({ resources }) {
  const [selectedImage, setSelectedImage] = useState(null);

  return (
    <div className="profile-card">

      <h2>🏫 Available College Resources</h2>

      {resources.length === 0 ? (
        <p>No resources found.</p>
      ) : (
        resources.map((resource) => {
          const type = resource.type?.toLowerCase() || "";
          const name = resource.name?.toLowerCase() || "";

          let images = [];

          if (name.includes("kimaya")) {
            images = [
              "/resource-images/theatre-1.jpg",
              "/resource-images/theatre-2.jpg",
              "/resource-images/theatre-3.JPG",
            ];
          }

          else if (name.includes("firodia")) {
            images = [
              "/resource-images/new1.JPG",
              "/resource-images/new2.JPG",
              "/resource-images/new3.JPG",
            ];
          }

          else if (
            name.includes("c6") ||
            name.includes("c6 classroom")
          ) {
            images = [
              "/resource-images/c1.JPG",
              "/resource-images/c2.JPG",
              "/resource-images/c3.JPG",
            ];
          }

          else if (type.includes("auditorium")) {
            images = [
              "/resource-images/auditorium-1.jpg",
              "/resource-images/auditorium-2.jpg",
              "/resource-images/auditorium-3.jpg",
            ];
          }

          else if (
            type.includes("theatre") ||
            type.includes("theater") ||
            type.includes("amphitheatre") ||
            type.includes("amphitheater")
          ) {
            images = [
              "/resource-images/theatre-1.jpg",
              "/resource-images/theatre-2.jpg",
            ];
          }

          else if (
            type.includes("badminton") ||
            name.includes("badminton")
          ) {
            images = [
              "/resource-images/badminton-1.jpg",
              "/resource-images/badminton-2.jpg",
              "/resource-images/badminton-3.JPG",
            ];
          }

          return (
            <div
              key={resource.id}
              className="resource-item"
            >

              {images.length > 0 && (
                <div className="resource-images">
                  {images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`${resource.name} ${index + 1}`}
                      className="clickable-resource-image"
                      onClick={() => setSelectedImage(image)}
                    />
                  ))}
                </div>
              )}

              <p>
                <strong>Name:</strong>{" "}
                {resource.name}
              </p>

              <p>
                <strong>Type:</strong>{" "}
                {resource.type}
              </p>

              <p>
                <strong>Capacity:</strong>{" "}
                {resource.capacity} persons
              </p>

              <p>
                <strong>Location:</strong>{" "}
                {resource.location}
              </p>

              <p>
                <strong>Facilities:</strong>{" "}
                {resource.facilities}
              </p>

              <hr />

            </div>
          );
        })
      )}

      {selectedImage && (
        <div
          className="image-modal"
          onClick={() => setSelectedImage(null)}
        >

          <button
            className="close-image"
            onClick={() => setSelectedImage(null)}
          >
            ×
          </button>

          <img
            src={selectedImage}
            alt="Enlarged resource"
            className="large-resource-image"
            onClick={(event) => event.stopPropagation()}
          />

        </div>
      )}

    </div>
  );
}

export default ResourceList;