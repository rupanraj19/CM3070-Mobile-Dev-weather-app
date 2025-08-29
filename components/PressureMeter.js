import { View, Text } from 'react-native';
import Svg, { Path, Line} from 'react-native-svg';

// pressure meter svg
  const PressureMeter= ({pressure})=>{
    // Set min/max scale—adjust as appropriate for your region
  const min = 980, max = 1040;
  const percent = Math.max(0, Math.min(1, (pressure - min) / (max - min)));
  const angle = -180 + percent * 180; // Map to -180° (left) to 0° (right)

  // Calculate needle endpoint
  const r = 75, cx = 80, cy = 80;
  const rad = (Math.PI * angle) / 180;
  const needleX = cx + r * Math.cos(rad);
  const needleY = cy + r * Math.sin(rad);

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={160} height={100}>
        {/* Arc */}
        <Path
          d="M10,80 A70,70 0 0,1 150,80"
          fill="none"
          stroke="#fff"
          strokeWidth={15}
          opacity={0.5}
        />
        {/* Needle */}
        <Line
          x1={cx}
          y1={cy-30}
          x2={needleX}
          y2={needleY}
          stroke="#fecc47"
          strokeWidth={4}
        />
      </Svg>
      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 22, position: 'absolute', top: 55 }}>
        {pressure} hPa
      </Text>
      <View style={{ flexDirection: 'row', width: 140, justifyContent: 'space-between', marginTop: 0 }}>
        <Text style={{ color: '#fff', fontWeight: 'bold', opacity: 0.7 }}>Low</Text>
        <Text style={{ color: '#fff', fontWeight: 'bold', opacity: 0.7 }}>High</Text>
      </View>
    </View>
  );
  }


  export default PressureMeter;