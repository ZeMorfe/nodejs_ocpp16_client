
window.Button = ({ onClick, label }) => {
    return (
        <button
            className="mdc-button mdc-card__action mdc-card__action--button"
            value={label}
            onClick={onClick}
        >
            {label}
        </button>
    );
};
