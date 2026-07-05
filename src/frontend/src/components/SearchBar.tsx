// File: src/components/SearchBar.tsx


export function SearchBar() {
    return (
        <div className="search-bar-container">
            <div className="search-section">
                <div className="search-label">Where</div>
                <input type="text" placeholder="Search destinations" className="search-input" />
            </div>

            <div className="search-divider"></div>

            <div className="search-section">
                <div className="search-label">When</div>
                <input type="text" placeholder="Add dates" className="search-input" />
            </div>

            <div className="search-divider"></div>

            <div className="search-section">
                <div className="search-label">Who</div>
                <input type="text" placeholder="Add guests" className="search-input" />
            </div>

            <button className="search-button" aria-label="Search">
                <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', fill: 'none', height: '16px', width: '16px', stroke: 'currentcolor', strokeWidth: '4', overflow: 'visible' }}>
                    <path fill="none" d="M13 24a11 11 0 1 0 0-22 11 11 0 0 0 0 22zm8-3 9 9"></path>
                </svg>
            </button>
        </div>
    );
}