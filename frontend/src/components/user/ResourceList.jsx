function ResourceList({ resources }) {
  return (
    <div className="profile-card">

      <h2>🏫 Available College Resources</h2>

      {resources.length === 0 ? (
        <p>No resources found.</p>
      ) : (
        resources.map((resource) => (
          <div
            key={resource.id}
            className="resource-item"
          >

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
        ))
      )}

    </div>
  );
}

export default ResourceList;