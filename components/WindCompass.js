import { View, Text} from 'react-native';
import Svg from "react-native-svg";
import { Circle, Line, Text as SvgText } from "react-native-svg";


const WindCompass = ({ degree = 0, size = 100 }) => {
  const radius = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;

  // Calculate rotation for the needle (wind direction; 0° is North)
  const rad = (Math.PI / 180) * (degree - 90); // -90 aligns 0° to top
  const needleLength = radius - 10;
  const x2 = cx + needleLength * Math.cos(rad);
  const y2 = cy + needleLength * Math.sin(rad);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {/* Compass dial */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="#fff"
          strokeWidth={4}
          fill="rgba(255,255,255,0.15)"
        />
        {/* Cardinal letters */}
        <SvgText x={cx} y={cy - radius + 18} fill="#fff" fontSize="14" textAnchor="middle">N</SvgText>
        <SvgText x={cx + radius - 16} y={cy} fill="#fff" fontSize="14" textAnchor="middle">E</SvgText>
        <SvgText x={cx} y={cy + radius - 8} fill="#fff" fontSize="14" textAnchor="middle">S</SvgText>
        <SvgText x={cx - radius + 16} y={cy} fill="#fff" fontSize="14" textAnchor="middle">W</SvgText>

        {/* Needle */}
        <Line
          x1={cx}
          y1={cy}
          x2={x2}
          y2={y2}
          stroke="#fecc47"
          strokeWidth={4}
          strokeLinecap="round"
        />
        {/* Center dot */}
        <Circle cx={cx} cy={cy} r={6} fill="#fecc47" />
      </Svg>
      <Text style={{ color: '#fff', marginTop: 6, fontWeight: 'bold' }}>{degree}°</Text>
    </View>
  );
};

export default WindCompass;
