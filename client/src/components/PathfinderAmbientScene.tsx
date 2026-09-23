export default function PathfinderAmbientScene() {
  return (
    <div aria-hidden="true" className="pathfinder-ambient pointer-events-none fixed inset-0 -z-0 overflow-hidden">
      <div className="pathfinder-ambient__wash" />
      <div className="pathfinder-ambient__moss pathfinder-ambient__moss--one" />
      <div className="pathfinder-ambient__moss pathfinder-ambient__moss--two" />
      <div className="pathfinder-ambient__ring pathfinder-ambient__ring--one" />
      <div className="pathfinder-ambient__ring pathfinder-ambient__ring--two" />
      <div className="pathfinder-ambient__pollen pathfinder-ambient__pollen--one" />
      <div className="pathfinder-ambient__pollen pathfinder-ambient__pollen--two" />
      <div className="pathfinder-ambient__pollen pathfinder-ambient__pollen--three" />
    </div>
  );
}
