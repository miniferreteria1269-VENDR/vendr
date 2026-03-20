function SearchBar({ searchTerm, setSearchTerm, handleSearchEnter }) {

  return (

    <input
      type="text"
      placeholder="Search products..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      onKeyDown={handleSearchEnter}
      style={{
        width: "100%",
        padding: "8px",
        marginBottom: "10px"
      }}
    />

  );

}

export default SearchBar;