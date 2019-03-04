
window.Button = ({ onClick, label, disabled = false }) => {
    return (
        <button
            className="mdc-button mdc-card__action mdc-card__action--button"
            value={label}
            onClick={onClick}
            disabled={disabled}
        >
            {label}
        </button>
    );
};
