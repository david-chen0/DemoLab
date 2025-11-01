import React, { useRef, useEffect } from 'react';

interface RoundSelectorProps {
  totalRounds: number;
  selectedRound: number;
  onRoundSelect: (round: number) => void;
  disabled?: boolean;
}

// TODO: Change the color of the round that is displayed based on which team won that round, maybe make this togglable?
const RoundSelector: React.FC<RoundSelectorProps> = ({
  totalRounds,
  selectedRound,
  onRoundSelect,
  disabled = false
}) => {
  // Hook for controlling the scroll position
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  /**
   * Auto-scroll effect to keep the selected round button visible
   * Runs whenever the selectedRound prop changes
   */
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      // Find the currently selected button using CSS attribute selector
      const selectedButton = container.querySelector(`[data-round="${selectedRound}"]`) as HTMLElement;
      
      if (selectedButton) {
        // Get the bounding rectangles to check visibility
        const containerRect = container.getBoundingClientRect();
        const buttonRect = selectedButton.getBoundingClientRect();
        
        // Check if the selected button is outside the visible scroll area
        if (buttonRect.left < containerRect.left || buttonRect.right > containerRect.right) {
          // Smoothly scroll the button into view, centered horizontally
          selectedButton.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',    // Don't scroll vertically
            inline: 'center'     // Center the button horizontally
          });
        }
      }
    }
  }, [selectedRound]); // Only trigger/re-render when selectedRound changes

  /**
   * Scroll the round buttons container to the left
   */
  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  /**
   * Scroll the round buttons container to the right
   */
  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  // Generate an array of round numbers from 1 to totalRounds
  const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1);

  return (
    <div className="round-selector">
      <h4>Round Selection</h4>
      <div className="round-selector-container">
        {/* Left scroll button */}
        <button
          className="scroll-btn scroll-left"
          onClick={handleScrollLeft}
          disabled={disabled}
          aria-label="Scroll left"
        >
          ←
        </button>
        
        {/* Scrollable container for round buttons */}
        <div className="round-buttons-container" ref={scrollContainerRef}>
          <div className="round-buttons">
            {/* Map over rounds array to create individual round buttons */}
            {rounds.map((round) => (
              <button
                key={round}
                data-round={round} // Custom data attribute for querySelector
                className={`round-btn ${selectedRound === round ? 'selected' : ''}`}
                onClick={() => onRoundSelect(round)}
                disabled={disabled}
                aria-label={`Select round ${round}`} // Accessibility label
              >
                {round}
              </button>
            ))}
          </div>
        </div>
        
        {/* Right scroll button */}
        <button
          className="scroll-btn scroll-right"
          onClick={handleScrollRight}
          disabled={disabled}
          aria-label="Scroll right"
        >
          →
        </button>
      </div>
    </div>
  );
};

export default RoundSelector;