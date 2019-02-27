
window.Button = ({ onClick, label }) => {
    return (
        <button value={label} onClick={onClick}>
            {label}
        </button>
    );
};
