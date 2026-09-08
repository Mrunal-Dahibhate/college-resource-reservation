function AdminResources({
  resources,
  showAddResource,
  setShowAddResource,
  newResource,
  setNewResource,
  handleAddResource,
}) {
  return (
    <div>
      <h1>🏫 Resources</h1>

      <button
        className="add-resource-btn"
        onClick={() =>
          setShowAddResource(!showAddResource)
        }
      >
        ➕ Add Resource
      </button>

      {showAddResource && (
        <div className="add-resource-form">

          <h2>Add College Resource</h2>

          <input
            type="text"
            placeholder="Resource name"
            value={newResource.name}
            onChange={(e) =>
              setNewResource({
                ...newResource,
                name: e.target.value,
              })
            }
          />

          <input
            type="text"
            placeholder="Resource type"
            value={newResource.type}
            onChange={(e) =>
              setNewResource({
                ...newResource,
                type: e.target.value,
              })
            }
          />

         <input
  type="number"
  placeholder="Capacity"
  value={newResource.capacity}
  onChange={(e) =>
    setNewResource({
      ...newResource,
      capacity: e.target.value,
    })
  }
/>

          <input
  placeholder="Location"
  value={newResource.location}
  onChange={(e) =>
    setNewResource({
      ...newResource,
      location: e.target.value,
    })
  }
/>

          <input
  placeholder="Facilities"
  value={newResource.facilities}
  onChange={(e) =>
    setNewResource({
      ...newResource,
      facilities: e.target.value,
    })
  }
/>

          <button onClick={handleAddResource}>
            Create Resource
          </button>

        </div>
      )}

      {resources.length === 0 ? (
        <p>No resources found.</p>
      ) : (
        <div className="admin-table">

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Capacity</th>
                <th>Location</th>
                <th>Facilities</th>
              </tr>
            </thead>

            <tbody>
              {resources.map((resource) => (
                <tr key={resource.id}>
                  <td>{resource.id}</td>
                  <td>{resource.name}</td>
                  <td>{resource.type}</td>
                  <td>{resource.capacity}</td>
                  <td>{resource.location} GB</td>
                  <td>{resource.facilities} GB</td>
                  <td>
  <span
    className={`status-badge status-${resource.status}`}
  >
    {resource.status}
  </span>
</td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>
      )}
    </div>
  );
}

export default AdminResources;