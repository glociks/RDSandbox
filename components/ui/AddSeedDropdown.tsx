import React, { useRef, useEffect } from 'react';
import { Dna, Shapes, Sprout, Grid, FunctionSquare, Type, Image as ImageIcon, Video, Camera } from 'lucide-react';
import { ContinuousSeedType, InitialSeedConfig } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectSeed: (type: ContinuousSeedType, seedConfig?: InitialSeedConfig, asStartingSeed?: boolean) => void;
  onImportImage: () => void;
  onImportVideo: () => void;
  onImportWebcam: () => void;
  containerRef?: React.RefObject<HTMLElement | null>;
}

interface SeedOption {
  type: ContinuousSeedType;
  name: string;
  desc: string;
  icon: any;
  action?: 'image' | 'video' | 'webcam';
  seedConfig?: InitialSeedConfig;
}

const SEED_GROUPS: {
  title: string;
  items: SeedOption[];
}[] = [
  {
    title: 'Procedural Generators',
    items: [
      {
        type: 'random',
        name: 'Random Noise',
        desc: 'Uniform random stochastic seed scatter',
        icon: Dna,
        seedConfig: {
          type: 'random', intensity: 1, randomThreshold: 0.05,
          perlinScale: 0.05, perlinThreshold: 0.5, perlinOctaves: 4, perlinSeed: 0,
          gridSpacingX: 10, gridSpacingY: 10, gridDotSize: 2, gridOffset: false,
          shapeSize: 20, shapeHollow: false, seedTarget: { u: 0.1, v: 0.9, w: 0 }
        }
      },
      {
        type: 'shapes',
        name: 'Geometric Shapes',
        desc: 'Circles, squares, rings, and scatter patterns',
        icon: Shapes,
        seedConfig: {
          type: 'shapes', intensity: 1, randomThreshold: 0.5,
          perlinScale: 0.05, perlinThreshold: 0.5, perlinOctaves: 4, perlinSeed: 0,
          gridSpacingX: 10, gridSpacingY: 10, gridDotSize: 2, gridOffset: false,
          shapeType: 'circle', shapeMode: 'single', shapeSize: 20,
          shapePosX: 0.5, shapePosY: 0.5, shapeCount: 1, shapeHollow: false,
          seedTarget: { u: 0.1, v: 0.9, w: 0 }
        }
      },
      {
        type: 'perlin',
        name: 'Perlin Noise',
        desc: 'Smooth organic multi-octave coherent noise',
        icon: Sprout,
        seedConfig: {
          type: 'perlin', intensity: 1, randomThreshold: 0.5,
          perlinScale: 15, perlinThreshold: 0.5, perlinOctaves: 2, perlinSeed: 0, perlinGradient: false,
          gridSpacingX: 10, gridSpacingY: 10, gridDotSize: 2, gridOffset: false,
          shapeSize: 20, shapeHollow: false, seedTarget: { u: 0.1, v: 0.9, w: 0 }
        }
      },
      {
        type: 'grid',
        name: 'Dot Grid',
        desc: 'Regular geometric lattice array',
        icon: Grid,
        seedConfig: {
          type: 'grid', intensity: 1, randomThreshold: 0.5,
          perlinScale: 0.05, perlinThreshold: 0.5, perlinOctaves: 4, perlinSeed: 0,
          gridSpacingX: 20, gridSpacingY: 20, gridDotSize: 2, gridOffset: false,
          shapeSize: 20, shapeHollow: false, seedTarget: { u: 0.1, v: 0.9, w: 0 }
        }
      }
    ]
  },
  {
    title: 'Mathematical & Text',
    items: [
      {
        type: 'math',
        name: 'Math Formula',
        desc: 'Custom trigonometric 2D spatial expression',
        icon: FunctionSquare,
        seedConfig: {
          type: 'math', intensity: 1, randomThreshold: 0.5,
          perlinScale: 0.05, perlinThreshold: 0.5, perlinOctaves: 4, perlinSeed: 0,
          gridSpacingX: 10, gridSpacingY: 10, gridDotSize: 2, gridOffset: false,
          shapeSize: 20, shapeHollow: false,
          mathExpression: 'Math.sin(x*0.1)*Math.cos(y*0.1) > 0',
          seedTarget: { u: 0.1, v: 0.9, w: 0 }
        }
      },
      {
        type: 'text',
        name: 'Text Label',
        desc: 'Rasterized typography and font stamps',
        icon: Type,
        seedConfig: {
          type: 'text', intensity: 1, randomThreshold: 0.5,
          perlinScale: 0.05, perlinThreshold: 0.5, perlinOctaves: 4, perlinSeed: 0,
          gridSpacingX: 10, gridSpacingY: 10, gridDotSize: 2, gridOffset: false,
          shapeSize: 20, shapeHollow: false,
          textString: 'McRD', textSize: 40, textPosX: 0.5, textPosY: 0.5,
          seedTarget: { u: 0.1, v: 0.9, w: 0 }
        }
      }
    ]
  },
  {
    title: 'Media & Camera Inputs',
    items: [
      {
        type: 'image',
        name: 'Image File',
        desc: 'Static PNG, JPG, or WebP image asset',
        icon: ImageIcon,
        action: 'image'
      },
      {
        type: 'video',
        name: 'Video Loop',
        desc: 'Looping MP4 or WebM video stream',
        icon: Video,
        action: 'video'
      },
      {
        type: 'webcam',
        name: 'Live Webcam',
        desc: 'Real-time camera video capture feed',
        icon: Camera,
        action: 'webcam'
      }
    ]
  }
];

export const AddSeedDropdown: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectSeed,
  onImportImage,
  onImportVideo,
  onImportWebcam,
  containerRef
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef?.current && containerRef.current.contains(target)) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, containerRef]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="ui-add-effect-menu absolute top-full left-0 right-0 z-50 max-h-[380px] overflow-y-auto custom-scrollbar"
    >
      <div className="ui-add-effect-sections">
        {SEED_GROUPS.map((group, gIdx) => (
          <div key={group.title} className="ui-add-effect-section">
            {gIdx > 0 && <div className="ui-add-effect-divider" />}
            <div className="ui-add-seed-group-title">{group.title}</div>
            <div className="ui-add-effect-grid">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    type="button"
                    className="ui-add-effect-item group"
                    onClick={() => {
                      if (item.action === 'image') {
                        onImportImage();
                      } else if (item.action === 'video') {
                        onImportVideo();
                      } else if (item.action === 'webcam') {
                        onImportWebcam();
                      } else {
                        onSelectSeed(item.type, item.seedConfig, true);
                      }
                      onClose();
                    }}
                  >
                    <div className={`effect-icon seed-icon-${item.type} shrink-0`}>
                      <Icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="ui-add-effect-title truncate">
                        {item.name}
                      </div>
                      <div className="ui-add-effect-desc truncate">
                        {item.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
