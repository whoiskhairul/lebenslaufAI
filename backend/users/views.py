from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User
from .serializers import RegisterSerializer, UserSerializer

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Base implementation returns standard 'access' and 'refresh'
        data = super().validate(attrs)
        # Inject metadata to reduce subsequent requests on load
        data['userId'] = str(self.user.id)
        data['email'] = self.user.email
        data['fullName'] = self.user.full_name or ''
        return data

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        user_data = UserSerializer(user).data
        return Response({
            "success": True,
            "data": {
                "userId": user_data['id'],
                "email": user_data['email'],
                "fullName": user_data['full_name']
            }
        }, status=status.HTTP_201_CREATED)

class UserDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user
