import { useEffect, useMemo } from "react";

export default function ControlsOverlay({
  onAction,
  onMoveAxis,
  onMoveAxisEnd,
}) {
  const moveHandlers = useMemo(() => {
    const make = (axis) => ({
      onPointerDown: (e) => {
        e.preventDefault();
        onMoveAxis?.(axis);
      },
      onPointerUp: () => onMoveAxisEnd?.(axis),
      onPointerCancel: () => onMoveAxisEnd?.(axis),
      onPointerLeave: () => onMoveAxisEnd?.(axis),
    });
    return {
      left: make(-1),
      right: make(1),
    };
  }, [onMoveAxis, onMoveAxisEnd]);

  useEffect(() => {
    // nothing; keep component presentational, handlers via props
  }, []);

  return (
    <div className="controls-overlay">
      <div className="left-controls">
        <div className="dpad" aria-label="Direction controls">
          <span className="dpad-gap dpad-up-left" aria-hidden="true" />
          <button
            className="control-button dpad-up"
            data-action="jump"
            type="button"
            onClick={() => onAction?.("jump")}
          >
            ↑
          </button>
          <span className="dpad-gap dpad-up-right" aria-hidden="true" />
          <button
            className="control-button dpad-left"
            data-action="moveLeft"
            type="button"
            {...moveHandlers.left}
          >
            ←
          </button>
          <div className="joystick-core" aria-hidden="true" />
          <button
            className="control-button dpad-right"
            data-action="moveRight"
            type="button"
            {...moveHandlers.right}
          >
            →
          </button>
          <span className="dpad-gap dpad-down-left" aria-hidden="true" />
          <button
            className="control-button dpad-down"
            data-action="crouch"
            type="button"
            onClick={() => onAction?.("crouch")}
          >
            ↓
          </button>
          <span className="dpad-gap dpad-down-right" aria-hidden="true" />
        </div>
      </div>

      <div className="right-controls">
        <div className="skill-stack" aria-label="Skill controls">
          <button
            className="control-button action-skill"
            data-action="skill1"
            id="skill-slot-1"
            type="button"
            onClick={() => onAction?.("skill1")}
          >
            <span className="skill-slot-icon">S1</span>
            <span className="skill-slot-name">Empty</span>
            <span className="skill-slot-cd">Ready</span>
          </button>
          <button
            className="control-button action-skill"
            data-action="skill2"
            id="skill-slot-2"
            type="button"
            onClick={() => onAction?.("skill2")}
          >
            <span className="skill-slot-icon">S2</span>
            <span className="skill-slot-name">Empty</span>
            <span className="skill-slot-cd">Ready</span>
          </button>
        </div>

        <div className="action-pad" aria-label="Action controls">
          <button
            className="control-button action-punch"
            data-action="punch"
            type="button"
            aria-label="Punch (P)"
            onClick={() => onAction?.("punch")}
          >
            <span className="action-label">P</span>
          </button>
          <button
            className="control-button action-kick"
            data-action="kick"
            type="button"
            aria-label="Kick (K)"
            onClick={() => onAction?.("kick")}
          >
            <span className="action-label">K</span>
          </button>
        </div>
      </div>
    </div>
  );
}

